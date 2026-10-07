import pytest
import uuid
from pathlib import Path
from app.database import init_db, get_db
from app.chat_engine import handle_chat_message

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.DATA_DIR", tmp_path)
    monkeypatch.setattr("app.config.settings.DB_NAME", "test_chat.db")
    init_db()
    yield

def test_chat_delete_refusal():
    res = handle_chat_message("ws-1", "Please delete all temporary files")
    assert "strictly disabled" in res["content"]
    assert res["tool_used"] == "refuse_delete"

def test_chat_counts(tmp_path):
    ws_id = str(uuid.uuid4())
    root = tmp_path / "ws"
    root.mkdir()
    
    with get_db() as conn:
        conn.execute("INSERT INTO workspaces (id, root_path) VALUES (?, ?)", (ws_id, str(root)))
        conn.execute(
            "INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
            (str(uuid.uuid4()), ws_id, str(root / "doc1.pdf"), "doc1.pdf", ".pdf", 1024)
        )
        conn.execute(
            "INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
            (str(uuid.uuid4()), ws_id, str(root / "doc2.pdf"), "doc2.pdf", ".pdf", 2048)
        )

    res = handle_chat_message(ws_id, "How many PDFs are there?")
    assert "**2** PDF" in res["content"]

def test_chat_folder_summary(tmp_path):
    ws_id = str(uuid.uuid4())
    root = tmp_path / "MyProject"
    root.mkdir()

    with get_db() as conn:
        conn.execute("INSERT INTO workspaces (id, root_path) VALUES (?, ?)", (ws_id, str(root)))
        f_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
            (f_id, ws_id, str(root / "report.pdf"), "report.pdf", ".pdf", 5000)
        )
        conn.execute(
            "INSERT INTO classifications (file_id, category, subfolder, confidence, tier, reason) VALUES (?, 'Documents / Resume', 'Reports', 0.9, 1, 'test')",
            (f_id,)
        )

    res = handle_chat_message(ws_id, "Give me summary of the folder")
    assert res["role"] == "assistant"
    assert "Summary of MyProject" in res["content"]
    assert "**1**" in res["content"]
    assert res["tool_used"] == "workspace_summary"
