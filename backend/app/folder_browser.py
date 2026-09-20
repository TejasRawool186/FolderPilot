import os
import sys
import string
from pathlib import Path
from typing import List, Dict, Any, Optional

PROTECTED_NAMES = {
    "windows",
    "system32",
    "syswow64",
    "program files",
    "program files (x86)",
    "programdata",
    "system volume information",
    "$recycle.bin",
    "recovery",
    "appdata"
}

def get_available_drives() -> List[str]:
    """Detects active Windows drives or root for Unix."""
    drives = []
    if sys.platform == "win32":
        for letter in string.ascii_uppercase:
            drive_str = f"{letter}:\\"
            if os.path.exists(drive_str):
                drives.append(drive_str)
    else:
        drives.append("/")
    return drives

def is_path_protected(path: Path) -> bool:
    """Checks if path is a forbidden system-critical folder."""
    try:
        resolved = path.resolve()
        
        # Check if it's directly a drive root
        if sys.platform == "win32":
            if resolved.parent == resolved: # Drive root e.g. C:\
                return True
        elif resolved == Path("/"):
            return True
            
        # Check if it matches user profile root directly
        home = Path.home().resolve()
        if resolved == home:
            return True
            
        # Check parts against protected directory names
        for part in resolved.parts:
            if part.lower() in PROTECTED_NAMES:
                return True
                
        return False
    except Exception:
        return True

def browse_directory(target_path_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns folder contents, drive roots, and navigation breadcrumbs.
    """
    drives = get_available_drives()
    
    if not target_path_str or target_path_str.strip() == "":
        # Default to user Documents or Desktop or first drive
        default_dir = Path.home() / "Downloads"
        if not default_dir.exists():
            default_dir = Path.home()
        current_path = default_dir.resolve()
    else:
        current_path = Path(target_path_str).resolve()
        
    if not current_path.exists() or not current_path.is_dir():
        current_path = Path.home().resolve()
        
    parent_path = None
    if current_path.parent != current_path:
        parent_path = str(current_path.parent)
        
    items = []
    try:
        with os.scandir(str(current_path)) as entries:
            for entry in entries:
                try:
                    if entry.is_dir(follow_symlinks=False):
                        entry_path = Path(entry.path)
                        # Skip hidden system folders starting with '.' or '$'
                        if entry.name.startswith(('.', '$')):
                            continue
                        protected = is_path_protected(entry_path)
                        has_children = False
                        try:
                            with os.scandir(entry.path) as sub:
                                has_children = any(s.is_dir(follow_symlinks=False) for s in sub)
                        except Exception:
                            has_children = False
                            
                        items.append({
                            "name": entry.name,
                            "path": str(entry_path),
                            "is_dir": True,
                            "is_protected": protected,
                            "has_children": has_children
                        })
                except (PermissionError, OSError):
                    continue
    except (PermissionError, OSError):
        pass
        
    items.sort(key=lambda x: x["name"].lower())
    
    return {
        "current_path": str(current_path),
        "parent_path": parent_path,
        "is_protected": is_path_protected(current_path),
        "items": items,
        "drives": drives
    }
