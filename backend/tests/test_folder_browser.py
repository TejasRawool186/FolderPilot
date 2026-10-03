import pytest
from pathlib import Path
from app.folder_browser import browse_directory, is_path_protected, get_available_drives

def test_available_drives():
    drives = get_available_drives()
    assert len(drives) > 0
    assert any(":" in d or "/" in d for d in drives)

def test_is_path_protected():
    assert is_path_protected(Path("C:/Windows")) is True
    assert is_path_protected(Path("C:/Program Files")) is True
    assert is_path_protected(Path("C:/Windows/System32")) is True

def test_browse_directory(tmp_path):
    sub1 = tmp_path / "SubFolderA"
    sub1.mkdir()
    sub2 = tmp_path / "SubFolderB"
    sub2.mkdir()
    
    result = browse_directory(str(tmp_path))
    assert result["current_path"] == str(tmp_path.resolve())
    names = [item["name"] for item in result["items"]]
    assert "SubFolderA" in names
    assert "SubFolderB" in names

def test_browse_dialog(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    monkeypatch.setattr("app.main.open_native_folder_dialog", lambda initial_path=None: "C:/TestFolder")
    client = TestClient(app)
    res = client.post("/fs/browse-dialog")
    assert res.status_code == 200
    assert res.json() == {"status": "selected", "path": "C:/TestFolder"}

