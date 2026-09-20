import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.database import get_db, query_all, query_one
from app.safe_ops import safe_move, ensure_safe_path

class JournalEngine:
    """
    Manages the append-only audit trail and transactional rollback (Undo).
    """

    @staticmethod
    def record_entry(
        op_id: str,
        workspace_id: str,
        op_type: str,
        src: str,
        dst: str,
        hash_before: Optional[str] = None,
        hash_after: Optional[str] = None
    ) -> str:
        journal_id = str(uuid.uuid4())
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO journal (id, op_id, workspace_id, type, src, dst, hash_before, hash_after, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (journal_id, op_id, workspace_id, op_type, src, dst, hash_before, hash_after, datetime.now(timezone.utc).isoformat())
            )
        return journal_id

    @staticmethod
    def undo_operation(journal_entry: Dict[str, Any], workspace_root: Path) -> Dict[str, Any]:
        """
        Reverses a single journaled operation:
        If MOVE/RENAME: moves from dst back to src.
        If MKDIR: if directory exists and is empty, removes it safely.
        """
        op_type = journal_entry["type"]
        src = Path(journal_entry["src"])
        dst = Path(journal_entry["dst"])
        
        result = {"journal_id": journal_entry["id"], "success": False, "message": ""}
        
        if op_type in ("MOVE", "RENAME"):
            if not dst.exists():
                result["message"] = f"File not found at destination '{dst}', cannot undo."
                return result
            try:
                # Move back to original source
                actual_restored, _, _ = safe_move(dst, src, workspace_root)
                # Mark undone in journal
                with get_db() as conn:
                    conn.execute(
                        "UPDATE journal SET undone_at = ? WHERE id = ?",
                        (datetime.now(timezone.utc).isoformat(), journal_entry["id"])
                    )
                    conn.execute(
                        "UPDATE ops SET status = 'undone' WHERE id = ?",
                        (journal_entry["op_id"],)
                    )
                result["success"] = True
                result["restored_to"] = str(actual_restored)
                result["message"] = f"Restored '{dst.name}' -> '{actual_restored}'"
            except Exception as e:
                result["message"] = f"Undo failed: {str(e)}"
                
        elif op_type == "MKDIR":
            # Safely remove only if empty
            if dst.exists() and dst.is_dir():
                try:
                    # Only rmdir if empty
                    dst.rmdir()
                    with get_db() as conn:
                        conn.execute(
                            "UPDATE journal SET undone_at = ? WHERE id = ?",
                            (datetime.utcnow().isoformat(), journal_entry["id"])
                        )
                    result["success"] = True
                    result["message"] = f"Pruned empty created directory '{dst}'"
                except OSError:
                    result["message"] = f"Directory '{dst}' is not empty, retained."
            else:
                result["success"] = True
                result["message"] = "Directory already non-existent."
                
        return result

    @classmethod
    def undo_batch(cls, plan_id: str, workspace_root: Path) -> List[Dict[str, Any]]:
        """
        Reverses all applied operations of a plan in reverse chronological order.
        """
        entries = query_all(
            """
            SELECT j.* FROM journal j
            JOIN ops o ON j.op_id = o.id
            WHERE o.plan_id = ? AND j.undone_at IS NULL
            ORDER BY j.ts DESC
            """,
            (plan_id,)
        )
        results = []
        for entry in entries:
            res = cls.undo_operation(entry, workspace_root)
            results.append(res)
            
        with get_db() as conn:
            conn.execute("UPDATE plans SET status = 'undone' WHERE id = ?", (plan_id,))
            
        # Clean up empty parent directories left behind in reverse
        cls._prune_empty_dirs(workspace_root)
        return results

    @classmethod
    def undo_all_for_workspace(cls, workspace_id: str, workspace_root: Path) -> List[Dict[str, Any]]:
        """
        Reverses every single un-reverted operation recorded for a workspace.
        """
        entries = query_all(
            """
            SELECT * FROM journal
            WHERE workspace_id = ? AND undone_at IS NULL
            ORDER BY ts DESC
            """,
            (workspace_id,)
        )
        results = []
        for entry in entries:
            res = cls.undo_operation(entry, workspace_root)
            results.append(res)
            
        cls._prune_empty_dirs(workspace_root)
        return results

    @staticmethod
    def _prune_empty_dirs(root: Path):
        """Recursively cleans up empty subdirectories up to the root, never deleting root."""
        try:
            for dirpath, dirnames, filenames in os.walk(str(root), topdown=False):
                current_dir = Path(dirpath)
                if current_dir.resolve() == root.resolve():
                    continue
                try:
                    if not any(current_dir.iterdir()):
                        current_dir.rmdir()
                except OSError:
                    pass
        except Exception:
            pass
