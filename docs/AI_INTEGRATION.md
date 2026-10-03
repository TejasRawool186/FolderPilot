# FolderPilot — Local AI Architecture & Ollama Integration

FolderPilot uses a local-first AI architecture powered by **Ollama**, defaulting to **Gemma 3 (1B)** with optional fallback to **Qwen 2.5 (1.5B)**. All AI inference runs on the local machine with zero cloud communication or external data egress.

---

## 1. Design Principles

1. **Local-Only Processing**: File contents, snippets, filenames, and folder structures never leave 127.0.0.1.
2. **Lightweight Footprint**: Designed to run on modest consumer hardware (8 GB RAM, multi-core CPU, no dedicated GPU required).
3. **Graceful Degradation**: If Ollama is offline or unavailable, FolderPilot falls back to fast deterministic rules (Tier 1–3) without halting or compromising safety.
4. **Structured JSON Output**: Classification tasks use constrained JSON mode (format="json", temperature 0.0) for predictable schema parsing.

---

## 2. Supported Local Models

### Primary: Gemma 3 (1B)
- **Model Tag**: `gemma3:1b`
- **Parameter Size**: ~1 Billion parameters
- **Format**: GGUF
- **Local Endpoint**: `http://127.0.0.1:11434`
- **Characteristics**: Fast inference on CPU, low memory footprint (~1.2 GB RAM).

### Alternative: Qwen 2.5 (1.5B)
- **Model Tag**: `qwen2.5:1.5b`
- **Parameter Size**: 1.5 Billion parameters
- **Format**: GGUF
- **Context Length**: 32,768 tokens
- **Local Endpoint**: `http://127.0.0.1:11434`
- **Characteristics**: Strong reasoning on complex text classification and structured JSON outputs.

---

## 3. Core AI Capabilities

### A. Intelligent 4-Tier File Categorization (Tier 4 Fallback)
When a file's category cannot be resolved with high confidence by file extensions (Tier 1), file hashes/signatures (Tier 2), or prototype keyword matching (Tier 3), FolderPilot extracts a 500-token content preview and queries the local LLM.

```json
{
  "category": "Documents / Resume",
  "subfolder": "Resumes",
  "suggested_name": "Resume_2026.pdf",
  "is_sensitive": false,
  "confidence": 0.92,
  "reason": "Document header indicates curriculum vitae"
}
```

### B. Natural Language Folder Chat
Users can interact conversationally with their workspace in the Workspace Terminal Chat drawer:
- Analyzes workspace composition (total files, size, category distribution, recent files).
- Answers analytical questions ("How should I structure my downloads?", "Which folders are taking the most space?").
- Maintains safety invariants: prompts requesting deletion trigger an educational refusal proposing `_Review_Later/` instead.

### C. On-Demand File Summarization & Insights
In the In-App File Previewer, users can trigger local summarization for any supported document:
- Generates a concise 2-3 sentence overview.
- Identifies 3 key takeaways.
- Suggests 2-3 organizational tags.

---

## 4. Backend AI Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/ai/status` | `GET` | Returns connection status, active model, base URL, and list of installed models. |
| `/api/ai/model` | `POST` | Dynamically switches the active Ollama model at runtime. |
| `/api/ai/summarize` | `POST` | Generates a 3-part structured summary with key takeaways from a file path or content snippet. |
| `/workspaces/{ws_id}/chat` | `POST` | Conversational dialogue engine with live workspace context and SQLite memory. |

---

## 5. Setting Up Ollama

1. Download and install Ollama from [ollama.com](https://ollama.com/).
2. Pull the models:
   ```bash
   # Default recommended model
   ollama pull gemma3:1b

   # Alternative model
   ollama pull qwen2.5:1.5b
   ```
3. FolderPilot automatically detects `http://127.0.0.1:11434` on startup and activates the live AI indicator in the top navigation bar.
