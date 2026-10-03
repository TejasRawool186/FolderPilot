import re
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.database import get_db, query_all, query_one
from app.safe_ops import get_non_colliding_destination
from pathlib import Path

DELETE_REQUEST_REGEX = re.compile(
    r'\b(delete|remove|erase|destroy|unlink|trash|purge|wipe|format|clean\s?up)\b', 
    re.I
)

COUNT_QUERY_REGEX = re.compile(
    r'\b(how many|count of|number of|total number)\b', 
    re.I
)

SIZE_QUERY_REGEX = re.compile(
    r'\b(total size|how much space|how big|size of)\b', 
    re.I
)

TOP_FILES_REGEX = re.compile(
    r'\b(biggest|largest|top\s?\d*|heaviest)\b', 
    re.I
)

RENAME_CMD_REGEX = re.compile(
    r'rename\s+(?:file\s+)?["\']?([^"\']+)["\']?\s+to\s+["\']?([^"\']+)["\']?',
    re.I
)

MOVE_CMD_REGEX = re.compile(
    r'move\s+(?:all\s+)?(\*\.\w+|\w+)\s+(?:files\s+)?to\s+["\']?([^"\']+)["\']?',
    re.I
)

def format_bytes(size_bytes: int) -> str:
    """Formats bytes to human readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def handle_chat_message(workspace_id: str, message: str) -> Dict[str, Any]:
    """
    Parses user natural language query, routes to deterministic SQL queries or creates a plan.
    Strictly refuses any deletion commands (FR-78).
    """
    msg_clean = message.strip()
    
    # 1. Strictly refuse deletion (FR-78)
    if DELETE_REQUEST_REGEX.search(msg_clean):
        return {
            "role": "assistant",
            "content": (
                "🛡️ **FolderPilot Safety Guarantee**: Deletion is strictly disabled by design. "
                "I can never delete, truncate, or wipe files. "
                "Would you like me to propose moving these files to `_Review_Later/` instead?"
            ),
            "tool_used": "refuse_delete",
            "action_plan_id": None
        }

    # 2. Rename command via Chat -> creates an unapproved Plan (FR-73)
    rename_match = RENAME_CMD_REGEX.search(msg_clean)
    if rename_match:
        target_name = rename_match.group(1).strip()
        new_name = rename_match.group(2).strip()
        
        file_match = query_one(
            "SELECT * FROM files WHERE workspace_id = ? AND (name = ? OR name LIKE ?)",
            (workspace_id, target_name, f"%{target_name}%")
        )
        if not file_match:
            return {
                "role": "assistant",
                "content": f"I couldn't find any file matching '{target_name}' in this workspace.",
                "tool_used": "rename_lookup_failed"
            }
            
        # Create unapproved plan
        plan_id = str(uuid.uuid4())
        op_id = str(uuid.uuid4())
        src_path = Path(file_match["path"])
        dst_path = src_path.parent / new_name

        with get_db() as conn:
            conn.execute("INSERT INTO plans (id, workspace_id, status) VALUES (?, ?, 'draft')", (plan_id, workspace_id))
            conn.execute(
                """
                INSERT INTO ops (id, plan_id, type, src, dst, approved, status)
                VALUES (?, ?, 'RENAME', ?, ?, 0, 'pending')
                """,
                (op_id, plan_id, str(src_path), str(dst_path))
            )

        return {
            "role": "assistant",
            "content": f"I've created a plan to rename **{src_path.name}** to **{new_name}**. Please review and approve it in the Plan drawer before it can take effect on disk.",
            "tool_used": "propose_rename",
            "action_plan_id": plan_id
        }

    # 3. Move command via Chat -> creates an unapproved Plan (FR-74)
    move_match = MOVE_CMD_REGEX.search(msg_clean)
    if move_match:
        target_pattern = move_match.group(1).strip()
        target_folder = move_match.group(2).strip()

        ext = target_pattern if target_pattern.startswith('.') else f".{target_pattern.replace('*.', '')}"
        matching_files = query_all(
            "SELECT * FROM files WHERE workspace_id = ? AND ext = ?",
            (workspace_id, ext.lower())
        )
        
        if not matching_files:
            return {
                "role": "assistant",
                "content": f"No files found with extension '{ext}'.",
                "tool_used": "move_lookup_failed"
            }

        workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        root_path = Path(workspace["root_path"])
        dest_dir = root_path / target_folder

        plan_id = str(uuid.uuid4())
        with get_db() as conn:
            conn.execute("INSERT INTO plans (id, workspace_id, status) VALUES (?, ?, 'draft')", (plan_id, workspace_id))
            # MKDIR op
            conn.execute(
                "INSERT INTO ops (id, plan_id, type, src, dst, approved, status) VALUES (?, ?, 'MKDIR', ?, ?, 0, 'pending')",
                (str(uuid.uuid4()), plan_id, str(root_path), str(dest_dir))
            )
            # MOVE ops
            for f in matching_files:
                src = Path(f["path"])
                dst = dest_dir / src.name
                conn.execute(
                    "INSERT INTO ops (id, plan_id, type, src, dst, approved, status) VALUES (?, ?, 'MOVE', ?, ?, 0, 'pending')",
                    (str(uuid.uuid4()), plan_id, str(src), str(dst))
                )

        return {
            "role": "assistant",
            "content": f"Proposed moving {len(matching_files)} `{ext}` files to `{target_folder}/`. A plan has been created for your approval.",
            "tool_used": "propose_move",
            "action_plan_id": plan_id
        }

    # 4. Deterministic Counts (FR-71)
    if COUNT_QUERY_REGEX.search(msg_clean):
        ext_match = re.search(r'\b(pdfs?|docx?|pptx?|images?|png|jpe?g|mp4|zips?|code|python)\b', msg_clean, re.I)
        if ext_match:
            term = ext_match.group(1).lower().rstrip('s')
            if term == "pdf":
                row = query_one("SELECT COUNT(*) as c FROM files WHERE workspace_id = ? AND ext = '.pdf'", (workspace_id,))
                return {"role": "assistant", "content": f"You have **{row['c']}** PDF documents in this workspace."}
            elif term in ("image", "images", "png", "jpg", "jpeg"):
                row = query_one("SELECT COUNT(*) as c FROM files WHERE workspace_id = ? AND ext IN ('.png','.jpg','.jpeg','.webp')", (workspace_id,))
                return {"role": "assistant", "content": f"You have **{row['c']}** image files in this workspace."}
            elif term in ("code", "python"):
                row = query_one("SELECT COUNT(*) as c FROM files WHERE workspace_id = ? AND ext IN ('.py','.js','.ts','.html','.css','.cpp')", (workspace_id,))
                return {"role": "assistant", "content": f"You have **{row['c']}** code files in this workspace."}

        total_row = query_one("SELECT COUNT(*) as c FROM files WHERE workspace_id = ?", (workspace_id,))
        return {"role": "assistant", "content": f"There are **{total_row['c']}** total files in this workspace."}

    # 5. Deterministic Size (FR-71)
    if SIZE_QUERY_REGEX.search(msg_clean):
        row = query_one("SELECT SUM(size) as s FROM files WHERE workspace_id = ?", (workspace_id,))
        total_size = row["s"] or 0
        return {"role": "assistant", "content": f"The total size of all indexed files is **{format_bytes(total_size)}**."}

    # 6. Largest / Heaviest Files (FR-71)
    if TOP_FILES_REGEX.search(msg_clean):
        largest = query_all("SELECT name, size FROM files WHERE workspace_id = ? ORDER BY size DESC LIMIT 5", (workspace_id,))
        lines = [f"- **{f['name']}** ({format_bytes(f['size'])})" for f in largest]
        return {
            "role": "assistant",
            "content": "Here are the top largest files taking up space:\n" + "\n".join(lines)
        }

    # 7. Explicit search by keyword / filename / content (FR-72)
    search_prefix_match = re.search(r'^(?:find|search|show|where is)\s+(.+)$', msg_clean, re.I)
    if search_prefix_match:
        search_keywords = search_prefix_match.group(1).strip()
        matches = query_all(
            """
            SELECT name, path, size, ext 
            FROM files 
            WHERE workspace_id = ? AND (name LIKE ? OR text_snippet LIKE ?)
            LIMIT 10
            """,
            (workspace_id, f"%{search_keywords}%", f"%{search_keywords}%")
        )
        if matches:
            results_text = "\n".join([f"- **{m['name']}** ({format_bytes(m['size'])})" for m in matches])
            return {
                "role": "assistant",
                "content": f"Found {len(matches)} matching files for **'{search_keywords}'**:\n{results_text}",
                "matched_files": [m["name"] for m in matches]
            }
        else:
            return {
                "role": "assistant",
                "content": f"No indexed files found matching **'{search_keywords}'**."
            }

    # 8. Local AI Assistant (Ollama)
    from app.ollama_client import OllamaClient
    if OllamaClient.is_available():
        # Build live workspace context
        ws = query_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        summary_row = query_one("SELECT COUNT(*) as c, SUM(size) as s FROM files WHERE workspace_id = ?", (workspace_id,))
        cnt = summary_row["c"] if summary_row else 0
        sz = summary_row["s"] if summary_row and summary_row["s"] else 0
        
        # Category breakdown
        cat_rows = query_all(
            """
            SELECT c.category, COUNT(*) as cnt 
            FROM classifications c 
            JOIN files f ON c.file_id = f.id 
            WHERE f.workspace_id = ? 
            GROUP BY c.category
            """, 
            (workspace_id,)
        )
        cat_summary = ", ".join([f"{r['category']} ({r['cnt']})" for r in cat_rows]) or "None yet"

        # Sample files
        sample_rows = query_all(
            "SELECT name, ext, size FROM files WHERE workspace_id = ? ORDER BY mtime DESC LIMIT 8",
            (workspace_id,)
        )
        sample_files = ", ".join([f"{f['name']} ({format_bytes(f['size'])})" for f in sample_rows]) or "Empty"

        workspace_context = (
            f"Workspace Path: {ws['root_path'] if ws else 'Unknown'}\n"
            f"Total Files: {cnt}\n"
            f"Total Size: {format_bytes(sz)}\n"
            f"Categories: {cat_summary}\n"
            f"Recent Files: {sample_files}"
        )

        # Retrieve recent conversation history
        history_rows = query_all(
            "SELECT role, content FROM chat_messages WHERE workspace_id = ? ORDER BY ts DESC LIMIT 6",
            (workspace_id,)
        )
        history = list(reversed(history_rows)) if history_rows else []

        ai_reply = OllamaClient.chat_response(msg_clean, workspace_context, history)
        if ai_reply:
            status = OllamaClient.get_status()
            active_model = status.get("model", "gemma3:1b")
            return {
                "role": "assistant",
                "content": ai_reply,
                "tool_used": "local_ai",
                "model": active_model
            }

    # 9. Fallback summary if AI is offline
    summary_row = query_one("SELECT COUNT(*) as c, SUM(size) as s FROM files WHERE workspace_id = ?", (workspace_id,))
    cnt = summary_row["c"] if summary_row else 0
    sz = summary_row["s"] if summary_row and summary_row["s"] else 0
    return {
        "role": "assistant",
        "content": (
            f"This workspace contains **{cnt} files** totaling **{format_bytes(sz)}**. "
            "You can ask me questions like *'How many PDFs?'*, *'Biggest 5 files'*, "
            "*'Find resume'*, or command *'Rename document.pdf to My_Doc.pdf'*."
        )
    }
