import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.database import get_db, query_all, query_one
from app.safe_ops import safe_move, safe_mkdir, check_file_locked, ensure_safe_path
from app.journal import JournalEngine
from app.config import settings

CATEGORY_FOLDER_MAPPING = {
    "Documents / Resume": "Documents",
    "College / Assignments / Notes": "College",
    "Certificates / Offers": "Certificates",
    "Images / Screenshots": "Images",
    "Media": "Media",
    "Installers / Archives": "Installers",
    "Code / Projects": "Code",
    "Finance / Bills": "Finance",
    "Private / Sensitive": "Private",
    "Others": "Others"
}

def generate_plan(workspace_id: str) -> Dict[str, Any]:
    """
    Generates an unapproved reorganization plan for the workspace.
    Groups loose files into category folders and moves duplicates to '_Duplicates/'.
    """
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
    if not workspace:
        raise ValueError(f"Workspace {workspace_id} not found")
        
    root_path = Path(workspace["root_path"])
    
    # Clean previous draft plans
    with get_db() as conn:
        conn.execute("DELETE FROM plans WHERE workspace_id = ? AND status = 'draft'", (workspace_id,))

    plan_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO plans (id, workspace_id, status) VALUES (?, ?, 'draft')",
            (plan_id, workspace_id)
        )

    # Fetch files and their classifications
    files = query_all(
        """
        SELECT f.*, c.category, c.subfolder, c.suggested_name, c.is_sensitive
        FROM files f
        JOIN classifications c ON f.id = c.file_id
        WHERE f.workspace_id = ?
        """,
        (workspace_id,)
    )

    # Fetch duplicates
    dup_members = query_all(
        """
        SELECT dm.file_id, dg.keep_file_id
        FROM dup_members dm
        JOIN dup_groups dg ON dm.group_id = dg.id
        WHERE dg.workspace_id = ?
        """,
        (workspace_id,)
    )
    dup_map = {d["file_id"]: d["keep_file_id"] for d in dup_members}

    ops = []
    created_folders = set()

    for f in files:
        file_id = f["id"]
        src_path = Path(f["path"])
        
        # Check if file is duplicate non-keep
        target_folder_name = None
        if file_id in dup_map and dup_map[file_id] != file_id:
            target_folder_name = "_Duplicates"
        elif f.get("is_sensitive"):
            target_folder_name = "Private"
        else:
            cat = f.get("category", "Others")
            base_folder = CATEGORY_FOLDER_MAPPING.get(cat, "Others")
            sub = f.get("subfolder")
            if sub and sub.strip() and sub.lower() != base_folder.lower():
                target_folder_name = f"{base_folder}/{sub.strip()}"
            else:
                target_folder_name = base_folder

        dest_dir = root_path / target_folder_name
        dest_file = dest_dir / src_path.name
        
        # If file is already inside target folder, skip moving
        if src_path.parent.resolve() == dest_dir.resolve():
            continue

        # MKDIR op if folder not yet planned
        if str(dest_dir) not in created_folders and not dest_dir.exists():
            mkdir_op_id = str(uuid.uuid4())
            ops.append({
                "id": mkdir_op_id,
                "plan_id": plan_id,
                "type": "MKDIR",
                "src": str(root_path),
                "dst": str(dest_dir),
                "approved": 0,
                "status": "pending"
            })
            created_folders.add(str(dest_dir))

        # MOVE op
        move_op_id = str(uuid.uuid4())
        ops.append({
            "id": move_op_id,
            "plan_id": plan_id,
            "type": "MOVE",
            "src": str(src_path),
            "dst": str(dest_file),
            "approved": 0,
            "status": "pending"
        })

    # Save ops to DB
    with get_db() as conn:
        for op in ops:
            conn.execute(
                """
                INSERT INTO ops (id, plan_id, type, src, dst, approved, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (op["id"], op["plan_id"], op["type"], op["src"], op["dst"], op["approved"], op["status"])
            )

    return {"plan_id": plan_id, "ops_count": len(ops), "ops": ops}

def calculate_dry_run(plan_id: str) -> Dict[str, Any]:
    """
    Computes dry run summary, conflict predictions, and file lock checks (FR-52, FR-96, FR-97).
    """
    plan = query_one("SELECT * FROM plans WHERE id = ?", (plan_id,))
    if not plan:
        raise ValueError("Plan not found")
        
    ops = query_all("SELECT * FROM ops WHERE plan_id = ?", (plan_id,))
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (plan["workspace_id"],))
    total_files_row = query_one("SELECT COUNT(*) as c FROM files WHERE workspace_id = ?", (plan["workspace_id"],))
    total_files_in_workspace = total_files_row["c"] if total_files_row else 1

    total_ops = len(ops)
    approved_ops = sum(1 for o in ops if o["approved"])
    mkdir_count = sum(1 for o in ops if o["type"] == "MKDIR")
    move_count = sum(1 for o in ops if o["type"] == "MOVE")
    rename_count = sum(1 for o in ops if o["type"] == "RENAME")
    
    total_bytes = 0
    conflicts = []
    locked_files = []

    for op in ops:
        src = Path(op["src"])
        dst = Path(op["dst"])
        if op["type"] in ("MOVE", "RENAME") and src.exists():
            try:
                total_bytes += src.stat().st_size
            except OSError:
                pass
            if check_file_locked(src):
                locked_files.append({"src": str(src), "error": "File currently locked by another process"})
            if dst.exists():
                conflicts.append({
                    "src": str(src),
                    "dst": str(dst),
                    "resolution": f"Auto-suffix -> {dst.stem} (1){dst.suffix}"
                })

    affected_pct = round((move_count + rename_count) / max(1, total_files_in_workspace), 2)
    requires_confirm = (
        affected_pct >= settings.LARGE_PLAN_THRESHOLD_RATIO or 
        (move_count + rename_count) >= settings.LARGE_PLAN_THRESHOLD_COUNT
    )

    return {
        "plan_id": plan_id,
        "total_ops": total_ops,
        "approved_ops": approved_ops,
        "mkdir_count": mkdir_count,
        "move_count": move_count,
        "rename_count": rename_count,
        "total_bytes_affected": total_bytes,
        "conflicts": conflicts,
        "locked_files": locked_files,
        "requires_number_confirmation": requires_confirm,
        "affected_percentage": affected_pct
    }

def apply_plan(plan_id: str) -> Dict[str, Any]:
    """
    Applies approved operations atomically per op with journal recording (FR-53, FR-56).
    """
    plan = query_one("SELECT * FROM plans WHERE id = ?", (plan_id,))
    if not plan:
        raise ValueError("Plan not found")
        
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (plan["workspace_id"],))
    if workspace.get("read_only"):
        raise PermissionError("Workspace is in read-only mode. Apply is disabled.")

    root_path = Path(workspace["root_path"])
    ops = query_all("SELECT * FROM ops WHERE plan_id = ? AND approved = 1 AND status = 'pending'", (plan_id,))

    applied = 0
    skipped = 0
    errors = []

    for op in ops:
        op_id = op["id"]
        op_type = op["type"]
        src = Path(op["src"])
        dst = Path(op["dst"])

        try:
            if op_type == "MKDIR":
                safe_mkdir(dst, root_path)
                JournalEngine.record_entry(op_id, workspace["id"], "MKDIR", str(src), str(dst))
                with get_db() as conn:
                    conn.execute("UPDATE ops SET status = 'applied' WHERE id = ?", (op_id,))
                applied += 1

            elif op_type in ("MOVE", "RENAME"):
                # Pre-flight check file lock
                if check_file_locked(src):
                    with get_db() as conn:
                        conn.execute("UPDATE ops SET status = 'skipped', error = 'Locked by process' WHERE id = ?", (op_id,))
                    skipped += 1
                    continue

                actual_dst, hash_before, hash_after = safe_move(src, dst, root_path)
                JournalEngine.record_entry(
                    op_id, workspace["id"], op_type, str(src), str(actual_dst), hash_before, hash_after
                )
                with get_db() as conn:
                    conn.execute(
                        "UPDATE ops SET status = 'applied', dst = ? WHERE id = ?",
                        (str(actual_dst), op_id)
                    )
                    # Update file record in DB
                    conn.execute(
                        "UPDATE files SET path = ?, name = ? WHERE workspace_id = ? AND path = ?",
                        (str(actual_dst), actual_dst.name, workspace["id"], str(src))
                    )
                applied += 1

        except Exception as e:
            with get_db() as conn:
                conn.execute("UPDATE ops SET status = 'failed', error = ? WHERE id = ?", (str(e), op_id))
            errors.append({"op_id": op_id, "error": str(e)})

    # Update plan status
    with get_db() as conn:
        conn.execute("UPDATE plans SET status = 'applied' WHERE id = ?", (plan_id,))

    return {
        "plan_id": plan_id,
        "applied_count": applied,
        "skipped_count": skipped,
        "error_count": len(errors),
        "errors": errors
    }
