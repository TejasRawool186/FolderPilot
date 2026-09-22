import os
import uuid
import mimetypes
import logging
from pathlib import Path
from typing import Dict, Any, Generator, Optional
from datetime import datetime
from app.database import get_db, query_all, query_one
from app.safe_ops import compute_sha256
from app.text_extractor import extract_text_from_file
from app.classifier import classify_file

logger = logging.getLogger("folderpilot.scanner")

# Active scan jobs dictionary
scan_jobs: Dict[str, Dict[str, Any]] = {}

def scan_workspace_worker(workspace_id: str, job_id: str, recursive: bool = True, max_depth: int = 10):
    """
    Background worker that indexes, extracts, and classifies files in workspace.
    """
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
    if not workspace:
        scan_jobs[job_id]["status"] = "failed"
        scan_jobs[job_id]["error"] = "Workspace not found"
        return

    root_path = Path(workspace["root_path"])
    scan_jobs[job_id]["status"] = "scanning"
    scan_jobs[job_id]["files_seen"] = 0
    scan_jobs[job_id]["bytes_seen"] = 0
    scan_jobs[job_id]["current_file"] = ""

    all_file_paths = []
    
    # Discovery phase
    try:
        if recursive:
            for root, dirs, files in os.walk(str(root_path)):
                # Skip hidden/system directories
                dirs[:] = [d for d in dirs if not d.startswith(('.', '$')) and d.lower() != "node_modules"]
                rel_depth = len(Path(root).relative_to(root_path).parts)
                if rel_depth > max_depth:
                    dirs[:] = []
                    continue
                for f in files:
                    if f.startswith(('.', '$')):
                        continue
                    all_file_paths.append(Path(root) / f)
        else:
            with os.scandir(str(root_path)) as it:
                for entry in it:
                    if entry.is_file(follow_symlinks=False) and not entry.name.startswith(('.', '$')):
                        all_file_paths.append(Path(entry.path))
    except Exception as e:
        scan_jobs[job_id]["status"] = "failed"
        scan_jobs[job_id]["error"] = str(e)
        return

    total_files = len(all_file_paths)
    scan_jobs[job_id]["total_files"] = total_files

    # Size-based collision tracking for lazy SHA-256
    size_map: Dict[int, list] = {}
    for p in all_file_paths:
        try:
            sz = p.stat().st_size
            size_map.setdefault(sz, []).append(p)
        except OSError:
            pass

    # Processing & Indexing phase
    for idx, filepath in enumerate(all_file_paths):
        if scan_jobs[job_id].get("cancel_requested"):
            scan_jobs[job_id]["status"] = "cancelled"
            return

        scan_jobs[job_id]["current_file"] = filepath.name
        scan_jobs[job_id]["files_seen"] = idx + 1

        try:
            stat = filepath.stat()
            size = stat.st_size
            mtime = stat.st_mtime
            ctime = stat.st_ctime
            scan_jobs[job_id]["bytes_seen"] += size
            mime_type, _ = mimetypes.guess_type(str(filepath))

            # Lazy hash: only if size matches another file (FR-11)
            file_hash = None
            if len(size_map.get(size, [])) > 1 and size > 0:
                file_hash = compute_sha256(filepath)

            # Incremental check: check if already in DB with same mtime/size (FR-13)
            existing = query_one(
                "SELECT id, mtime, size FROM files WHERE workspace_id = ? AND path = ?",
                (workspace_id, str(filepath))
            )
            
            file_id = None
            if existing and existing["mtime"] == mtime and existing["size"] == size:
                file_id = existing["id"]
            else:
                # Extract text snippet (~500 tokens)
                text_snippet = extract_text_from_file(filepath)

                if existing:
                    file_id = existing["id"]
                    with get_db() as conn:
                        conn.execute(
                            """
                            UPDATE files 
                            SET size = ?, mtime = ?, ctime = ?, mime = ?, sha256 = ?, text_snippet = ?
                            WHERE id = ?
                            """,
                            (size, mtime, ctime, mime_type, file_hash, text_snippet, file_id)
                        )
                else:
                    file_id = str(uuid.uuid4())
                    with get_db() as conn:
                        conn.execute(
                            """
                            INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime, mime, sha256, text_snippet)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (file_id, workspace_id, str(filepath), filepath.name, filepath.suffix.lower(), 
                             size, mtime, ctime, mime_type, file_hash, text_snippet)
                        )

                # Classify file (4-tier pipeline)
                cls_result = classify_file(
                    filename=filepath.name,
                    filesize=size,
                    workspace_id=workspace_id,
                    text_snippet=text_snippet
                )

                with get_db() as conn:
                    conn.execute("DELETE FROM classifications WHERE file_id = ?", (file_id,))
                    conn.execute(
                        """
                        INSERT INTO classifications (file_id, category, subfolder, confidence, tier, reason, is_sensitive, suggested_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (file_id, cls_result["category"], cls_result.get("subfolder"), cls_result["confidence"],
                         cls_result["tier"], cls_result["reason"], int(cls_result.get("is_sensitive", False)),
                         cls_result.get("suggested_name"))
                    )

        except Exception as e:
            logger.warning(f"Error processing {filepath}: {e}")
            continue

    # Duplicate grouping phase (FR-30, FR-32)
    _group_duplicates(workspace_id)

    scan_jobs[job_id]["status"] = "completed"
    scan_jobs[job_id]["current_file"] = "Scan finished successfully"

def _group_duplicates(workspace_id: str):
    """
    Finds exact hash matches, selects a 'keep' file (newest mtime), and records duplicate groups.
    """
    with get_db() as conn:
        conn.execute("DELETE FROM dup_groups WHERE workspace_id = ?", (workspace_id,))

    # Find duplicate hashes
    duplicates = query_all(
        """
        SELECT sha256, COUNT(*) as cnt
        FROM files
        WHERE workspace_id = ? AND sha256 IS NOT NULL
        GROUP BY sha256
        HAVING cnt > 1
        """,
        (workspace_id,)
    )

    for dup in duplicates:
        h = dup["sha256"]
        group_id = str(uuid.uuid4())
        members = query_all(
            "SELECT id, mtime FROM files WHERE workspace_id = ? AND sha256 = ? ORDER BY mtime DESC",
            (workspace_id, h)
        )
        keep_file_id = members[0]["id"] if members else None
        
        with get_db() as conn:
            conn.execute(
                "INSERT INTO dup_groups (id, workspace_id, kind, keep_file_id) VALUES (?, ?, 'exact', ?)",
                (group_id, workspace_id, keep_file_id)
            )
            for m in members:
                conn.execute(
                    "INSERT INTO dup_members (group_id, file_id) VALUES (?, ?)",
                    (group_id, m["id"])
                )
