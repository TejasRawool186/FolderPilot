import pytest
import uuid
from pathlib import Path
from app.database import init_db, get_db, query_one
from app.safe_ops import safe_move
from app.journal import JournalEngine

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_folderpilot.db"
    monkeypatch.setattr("app.config.settings.DATA_DIR", tmp_path)
    monkeypatch.setattr("app.config.settings.DB_NAME", "test_folderpilot.db")
    init_db()
    yield

def test_journal_recording_and_undo(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    
    ws_id = str(uuid.uuid4())
    plan_id = str(uuid.uuid4())
    op_id = str(uuid.uuid4())
    
    with get_db() as conn:
        conn.execute("INSERT INTO workspaces (id, root_path) VALUES (?, ?)", (ws_id, str(root)))
        conn.execute("INSERT INTO plans (id, workspace_id, status) VALUES (?, ?, 'draft')", (plan_id, ws_id))
        conn.execute(
            "INSERT INTO ops (id, plan_id, type, src, dst, approved, status) VALUES (?, ?, 'MOVE', 'src', 'dst', 1, 'pending')",
            (op_id, plan_id)
        )

    src_file = root / "myfile.pdf"
    src_file.write_text("important content")
    dest_file = root / "Documents" / "myfile.pdf"

    # Execute safe move
    actual_dst, hash_b, hash_a = safe_move(src_file, dest_file, root)
    journal_id = JournalEngine.record_entry(op_id, ws_id, "MOVE", str(src_file), str(actual_dst), hash_b, hash_a)

    assert not src_file.exists()
    assert dest_file.exists()

    # Trigger undo
    entry = query_one("SELECT * FROM journal WHERE id = ?", (journal_id,))
    res = JournalEngine.undo_operation(entry, root)

    assert res["success"] is True
    assert src_file.exists()
    assert not dest_file.exists()
    assert src_file.read_text() == "important content"
