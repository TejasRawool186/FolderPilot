import os
import shutil
import hashlib
from pathlib import Path
from typing import Tuple, Optional

class SafetyViolationError(Exception):
    """Raised when an operation violates FolderPilot non-destructive rules."""
    pass

class FileLockError(Exception):
    """Raised when a file is locked or in use by another Windows process."""
    pass

def compute_sha256(filepath: Path) -> str:
    """Computes SHA-256 hash in 64KB blocks."""
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def check_file_locked(filepath: Path) -> bool:
    """Checks if a file is currently locked by opening with exclusive append."""
    if not filepath.exists() or filepath.is_dir():
        return False
    try:
        # On Windows, opening with r+ tests if another application has an exclusive lock
        with open(filepath, 'r+b'):
            pass
        return False
    except (PermissionError, OSError):
        return True

def ensure_safe_path(target_path: Path, workspace_root: Path) -> Path:
    """
    Guarantees path is strictly within the allowed workspace boundary.
    Prevents directory traversal and symlink escapes (FR-91).
    """
    resolved_root = workspace_root.resolve()
    resolved_target = target_path.resolve()
    
    # Must be relative to or equal to root
    try:
        resolved_target.relative_to(resolved_root)
    except ValueError:
        raise SafetyViolationError(
            f"Path Traversal Violation: '{target_path}' escapes workspace boundary '{workspace_root}'."
        )
    return resolved_target

def get_non_colliding_destination(destination_file: Path) -> Path:
    """
    FR-54: Conflict handling - never overwrite. Auto-suffixes 'name (1).ext'.
    """
    if not destination_file.exists():
        return destination_file
    
    parent = destination_file.parent
    stem = destination_file.stem
    suffix = destination_file.suffix
    
    counter = 1
    candidate = parent / f"{stem} ({counter}){suffix}"
    while candidate.exists():
        counter += 1
        candidate = parent / f"{stem} ({counter}){suffix}"
    return candidate

def safe_mkdir(dir_path: Path, workspace_root: Path) -> Path:
    """
    Safe directory creation within workspace.
    """
    resolved_dir = ensure_safe_path(dir_path, workspace_root)
    resolved_dir.mkdir(parents=True, exist_ok=True)
    return resolved_dir

def safe_move(
    source: Path, 
    destination: Path, 
    workspace_root: Path,
    expected_mtime: Optional[float] = None,
    expected_size: Optional[int] = None
) -> Tuple[Path, str, str]:
    """
    Executes a safe move from source to destination:
    1. Validates paths are inside workspace.
    2. Validates source still exists and matches expected mtime/size (FR-55).
    3. Checks Windows file lock (FR-97).
    4. Auto-suffixes destination if colliding (FR-54).
    5. Creates destination parent directory if missing.
    6. Moves intra-drive atomically via rename, or cross-drive with copy + hash verification (FR-58).
    
    Returns: (actual_destination_path, hash_before, hash_after)
    """
    src_res = ensure_safe_path(source, workspace_root)
    dst_res = ensure_safe_path(destination, workspace_root)
    
    if not src_res.exists():
        raise FileNotFoundError(f"Source file does not exist: {src_res}")
        
    if check_file_locked(src_res):
        raise FileLockError(f"File is locked or in use by another process: {src_res}")
        
    stat = src_res.stat()
    if expected_size is not None and stat.st_size != expected_size:
        raise SafetyViolationError(
            f"File size changed since plan generation (expected {expected_size}, got {stat.st_size}). Skipping."
        )
    if expected_mtime is not None and abs(stat.st_mtime - expected_mtime) > 1.0:
        raise SafetyViolationError(
            f"File modified since plan generation (expected {expected_mtime}, got {stat.st_mtime}). Skipping."
        )
        
    # Auto-resolve collisions
    actual_dst = get_non_colliding_destination(dst_res)
    actual_dst.parent.mkdir(parents=True, exist_ok=True)
    
    # Hash before move
    hash_before = compute_sha256(src_res)
    
    # Check if same drive / mount
    same_drive = False
    try:
        same_drive = (src_res.drive.upper() == actual_dst.drive.upper())
    except AttributeError:
        # Non-Windows fallback
        same_drive = (os.stat(src_res).st_dev == os.stat(actual_dst.parent).st_dev)
        
    if same_drive:
        # Atomic rename within same volume
        src_res.rename(actual_dst)
    else:
        # Cross-volume copy with verified integrity
        shutil.copy2(src_res, actual_dst)
        hash_after_copy = compute_sha256(actual_dst)
        if hash_after_copy != hash_before:
            # Verification failed, remove failed copy and raise
            os.remove(actual_dst) # discarding incomplete copy
            raise SafetyViolationError("Cross-drive verification failed: hash mismatch after copy!")
        # Only after verification passes, unlink the source
        os.remove(src_res)
        
    hash_after = compute_sha256(actual_dst)
    return actual_dst, hash_before, hash_after

def safe_rename(
    source: Path, 
    new_name: str, 
    workspace_root: Path
) -> Tuple[Path, str, str]:
    """
    Executes a safe rename of a file within its current parent directory.
    """
    src_res = ensure_safe_path(source, workspace_root)
    # Sanitize new_name to prevent path traversal in filename
    clean_name = Path(new_name).name
    destination = src_res.parent / clean_name
    return safe_move(src_res, destination, workspace_root)
