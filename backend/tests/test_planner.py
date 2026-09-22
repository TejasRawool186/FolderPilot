import pytest
import uuid
from pathlib import Path
from app.database import init_db, get_db
from app.planner import generate_plan, calculate_dry_run, apply_plan

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.DATA_DIR", tmp_path)
    monkeypatch.setattr("app.config.settings.DB_NAME", "test_planner.db")
    init_db()
    yield

def test_plan_generation_and_dryrun(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    ws_id = str(uuid.uuid4())
    
    file1 = root / "script.py"
    file1.write_text("print('test')")
    
    file2 = root / "photo.png"
    file2.write_text("fake image data")

    with get_db() as conn:
        conn.execute("INSERT INTO workspaces (id, root_path) VALUES (?, ?)", (ws_id, str(root)))
        f1_id = str(uuid.uuid4())
        f2_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
            (f1_id, ws_id, str(file1), "script.py", ".py", 100)
        )
        conn.execute(
            "INSERT INTO files (id, workspace_id, path, name, ext, size, mtime, ctime) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
            (f2_id, ws_id, str(file2), "photo.png", ".png", 200)
        )
        conn.execute(
            "INSERT INTO classifications (file_id, category, subfolder, confidence, tier, reason) VALUES (?, 'Code / Projects', 'Python', 0.95, 1, 'Rule')",
            (f1_id,)
        )
        conn.execute(
            "INSERT INTO classifications (file_id, category, subfolder, confidence, tier, reason) VALUES (?, 'Images / Screenshots', 'Images', 0.85, 1, 'Rule')",
            (f2_id,)
        )

    plan_res = generate_plan(ws_id)
    plan_id = plan_res["plan_id"]
    assert plan_res["ops_count"] > 0

    dry_run = calculate_dry_run(plan_id)
    assert dry_run["total_ops"] > 0
    assert dry_run["move_count"] == 2

    # Approve all ops and apply
    with get_db() as conn:
        conn.execute("UPDATE ops SET approved = 1 WHERE plan_id = ?", (plan_id,))

    apply_res = apply_plan(plan_id)
    assert apply_res["applied_count"] > 0
    assert not file1.exists() # Moved to Code/Python
    assert (root / "Code" / "Python" / "script.py").exists()
