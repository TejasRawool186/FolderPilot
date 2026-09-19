# FolderPilot — Local AI Architecture & Ollama Integration

FolderPilot uses a local-first, privacy-guaranteed AI architecture powered by **Ollama** and **Qwen 2.5 (1.5B)**. All AI inference runs 100% on the local CPU/GPU with **zero cloud communication or external data egress**.

---

## 1. Design Principles

1. **Air-Gapped Privacy**: File contents, snippets, filenames, and folder structures never leave `127.0.0.1`.
2. **CPU-Friendly Lightweight Footprint**: Designed to run smoothly on modest hardware (AMD Ryzen 3, 8 GB RAM, CPU-only).
3. **Graceful Degradation**: If Ollama is offline or unavailable, FolderPilot seamlessly falls back to fast deterministic rules (Tier 1–3) without crashing or degrading user safety.
4. **Structured JSON Output**: All classification tasks use constrained JSON mode (`format="json"`, temperature 0.0) for predictable schema parsing.

---

## 2. Integrated Local Model: Qwen 2.5 (1.5B)

- **Model Tag**: `qwen2.5:1.5b`
- **Parameter Size**: 1.5 Billion parameters
- **Format**: GGUF (Q4_K_M quantization, ~986 MB download size)
- **Context Length**: 32,768 tokens
- **Local Endpoint**: `http://127.0.0.1:11434`

---

## 3. Core AI Capabilities

### A. Intelligent 4-Tier File Categorization (Tier 4 Fallback)
When a file's category cannot be resolved with high confidence by file extensions (Tier 1), file hashes/signatures (Tier 2), or prototype keyword matching (Tier 3), FolderPilot extracts a 500-token content preview and queries `qwen2.5:1.5b`.

```json
{
  "category": "Documents / Resume",
  "subfolder": "Resumes",
  "suggested_name": "Tejas_Rawool_Resume_2026.pdf",
  "is_sensitive": false,
  "confidence": 0.92,
  "reason": "Document header indicates senior software engineer curriculum vitae"
}
```

### B. Natural Language Folder Chat
Users can interact conversationally with their workspace in the **Workspace Terminal Chat** drawer.
- Analyzes workspace composition (total files, size, category distribution, recent files).
- Answers analytical questions (*"How should I structure my chaotic downloads?"*, *"Which folders are taking the most space?"*).
- Strictly maintains the non-destructive safety invariant: any prompt requesting deletion triggers an educational safety guarantee response proposing `_Review_Later/` instead.

### C. On-Demand File Summarization & Insights
In the **In-App File Previewer**, users can trigger on-the-fly local summarization for any PDF, Word document, text file, or code file:
- Generates a concise 2-3 sentence overview.
- Identifies 3 key bullet points / takeaways.
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
2. Pull the lightweight model:
   ```bash
   ollama run qwen2.5:1.5b
   ```
3. FolderPilot automatically detects `http://127.0.0.1:11434` on startup and activates the live AI indicator in the top navigation bar (`🟢 AI: qwen2.5:1.5b`).
