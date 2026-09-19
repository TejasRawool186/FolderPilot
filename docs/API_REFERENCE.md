# FolderPilot — REST & SSE API Reference

Base Server URL: `http://127.0.0.1:8000`  
Interactive OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`

---

## 1. System & Health

### `GET /api/health`
Health check endpoint.
- **Response**:
  ```json
  { "status": "ok", "app": "FolderPilot", "version": "1.0.0" }
  ```

---

## 2. Workspace Management

### `GET /workspaces`
List all connected workspace records.

### `POST /workspaces`
Create or connect to a workspace folder.
- **Body**:
  ```json
  { "path": "C:\\Users\\User\\Downloads", "read_only": false }
  ```

### `GET /workspaces/{ws_id}`
Retrieve a single workspace record.

### `GET /workspaces/{ws_id}/stats`
Returns total file count, total byte size, category distribution, duplicate count, sensitive file count, and the algorithmic Chaos Score.

### `GET /workspaces/{ws_id}/tree`
Returns hierarchical directory JSON for D3 Treemap and Sunburst visualizations.
- **Query Params**: `view` (`current` | `proposed`)

### `GET /workspaces/{ws_id}/files`
Paginated/filtered list of indexed files.
- **Query Params**: `category`, `search`, `sensitive_only`

### `GET /workspaces/{ws_id}/duplicates`
Returns clustered duplicate groups with recommended keep-file strategies.

---

## 3. Background Scanner Engine

### `POST /workspaces/{ws_id}/scan`
Initiates an asynchronous background scanning job.
- **Body**:
  ```json
  { "recursive": true, "max_depth": 10 }
  ```
- **Response**:
  ```json
  { "job_id": "uuid-v4", "status": "started" }
  ```

### `GET /jobs/{job_id}`
Poll the status of an ongoing or completed scan job.

### `GET /jobs/{job_id}/stream`
Server-Sent Events (SSE) live progress stream (`text/event-stream`) broadcasting real-time progress, files processed, bytes read, and current file name.

---

## 4. Reorganization Plans & Safe Operations

### `POST /workspaces/{ws_id}/plan`
Generates a draft organization plan (default state: unapproved).

### `GET /workspaces/{ws_id}/plans`
Lists past and active organization plans.

### `GET /plan/{plan_id}/ops`
Lists individual proposed operations (`MKDIR`, `MOVE`, `RENAME`) inside a plan.

### `PATCH /plan/{plan_id}/ops`
Approve or unapprove specific operations prior to execution.
- **Body**:
  ```json
  { "op_ids": ["op-uuid-1", "op-uuid-2"], "approved": true }
  ```

### `GET /plan/{plan_id}/dryrun`
Simulates operations on an in-memory virtual filesystem tree to test for conflicts, collisions, or missing directories.

### `POST /plan/{plan_id}/apply`
Atomically applies approved operations to disk while writing to the append-only rollback journal.

---

## 5. Journal & 100% Rollback Engine

### `GET /workspaces/{ws_id}/journal`
Returns chronological audit journal history.

### `POST /journal/undo`
Rolls back filesystem changes safely.
- **Body**:
  ```json
  {
    "scope": "batch",  // "batch" | "op" | "all"
    "target_id": "plan-uuid-or-op-uuid"
  }
  ```

---

## 6. Server-Side Filesystem & In-App Previews

### `GET /fs/browse`
System directory browser with Windows logical drive detection and protected system folder guards.
- **Query Params**: `path` (optional, defaults to system drives or root)

### `GET /fs/file`
Byte-range streaming endpoint for multimedia previews (images, audio, video, PDFs).

### `GET /fs/file/text`
Reads and extracts text from plain text, code, Word (.docx), PowerPoint (.pptx), or binary files (as hex dumps).

### `POST /fs/reveal`
Reveals a target file or folder in native Windows File Explorer.
- **Body**:
  ```json
  { "path": "C:\\path\\to\\file.txt" }
  ```

---

## 7. Local AI & Ollama Endpoints

### `GET /api/ai/status`
Returns local Ollama server status, currently selected active model, and list of installed models.

### `POST /api/ai/model`
Switches the active model for LLM operations.
- **Body**:
  ```json
  { "model": "qwen2.5:1.5b" }
  ```

### `POST /api/ai/summarize`
Summarizes file contents using local Qwen 2.5 (1.5B).
- **Body**:
  ```json
  { "path": "C:\\path\\to\\document.pdf" }
  ```

### `POST /workspaces/{ws_id}/chat`
Conversational chat interface with live workspace context, safety invariants, and action staging.
- **Body**:
  ```json
  { "message": "How many images do I have in this project?" }
  ```

### `GET /workspaces/{ws_id}/chat/history`
Retrieves chat history for a workspace.
