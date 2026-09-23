# FolderPilot — Backend Engine

The backend of **FolderPilot** is a high-performance, asynchronous REST and Server-Sent Events (SSE) service built with **FastAPI**, **SQLite (WAL mode)**, and **Ollama**.

---

## 🏛️ Architecture & Modules

- **`app/main.py`**: FastAPI application entry point, lifecycle management, CORS configuration, and endpoint routing.
- **`app/config.py`**: Pydantic BaseSettings management with environment variable overrides (`FOLDERPILOT_*`).
- **`app/database.py`**: SQLite database initialization, WAL (Write-Ahead Logging) mode configuration, and thread-safe connection pooling.
- **`app/scanner.py`**: Asynchronous directory scanner with recursive traversal, lazy hashing, text extraction, and live SSE event broadcasting.
- **`app/classifier.py`**: 4-tier classification pipeline (Extensions -> Hashes -> Prototypes -> Small Local LLM).
- **`app/chaos_score.py`**: Algorithmic folder disorder computation (0 to 100) assessing depth balance, root-level pollution, and duplicate ratios.
- **`app/planner.py`**: Reorganization plan generator and virtual in-memory dry-run conflict detector.
- **`app/safe_ops.py`**: Non-destructive filesystem executor (`mkdir`, `move`, `rename` ONLY) with deterministic collision auto-suffixing (`(1)`).
- **`app/journal.py`**: Append-only transaction journal supporting atomic rollback (single-op, batch, or total workspace undo).
- **`app/folder_browser.py`**: Server-side directory browser with logical drive detection and hard OS path security guards.
- **`app/sensitive.py`**: Regex and algorithmic detector for sensitive documents (Aadhaar, PAN, Passports, Bank Statements).
- **`app/chat_engine.py`**: Conversational folder assistant routing natural queries to SQLite queries or local Qwen 2.5 LLM.
- **`app/ollama_client.py`**: Local HTTP client for Ollama instance (`127.0.0.1:11434`) targeting `qwen2.5:1.5b`.

---

## 🧪 Testing

The backend includes a comprehensive suite of 18 automated unit and integration tests:

```bash
# Run tests
pytest -v

# Run with coverage
pytest --cov=app tests/
```

---

## 🚀 Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Start development server with hot-reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.
