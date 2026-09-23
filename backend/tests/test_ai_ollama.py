import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.DATA_DIR", tmp_path)
    monkeypatch.setattr("app.config.settings.DB_NAME", "test_ai.db")
    init_db()
    yield

client = TestClient(app)

def test_get_ai_status():
    with patch("app.ollama_client.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "models": [{"name": "qwen2.5:1.5b"}, {"name": "qwen3:1.7b"}]
        }
        res = client.get("/api/ai/status")
        assert res.status_code == 200
        data = res.json()
        assert data["available"] is True
        assert data["model"] == "qwen2.5:1.5b"
        assert "qwen2.5:1.5b" in data["installed_models"]

def test_set_ai_model():
    with patch("app.ollama_client.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "models": [{"name": "qwen2.5:1.5b"}, {"name": "qwen3:1.7b"}]
        }
        res = client.post("/api/ai/model", json={"model": "qwen3:1.7b"})
        assert res.status_code == 200
        data = res.json()
        assert data["model"] == "qwen3:1.7b"

def test_summarize_content():
    with patch("app.ollama_client.OllamaClient.is_available", return_value=True), \
         patch("app.ollama_client.OllamaClient.summarize_content") as mock_sum:
        mock_sum.return_value = {
            "model": "qwen2.5:1.5b",
            "summary": "### Overview\nTest document summary."
        }
        res = client.post("/api/ai/summarize", json={"filename": "notes.txt", "content": "Sample content"})
        assert res.status_code == 200
        data = res.json()
        assert data["model"] == "qwen2.5:1.5b"
        assert "Overview" in data["summary"]
