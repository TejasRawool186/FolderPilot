# FolderPilot — Frontend Client

The frontend of **FolderPilot** is a local web application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **D3.js**.

---

## 🎨 Architecture & Components

- **`src/app/`**: Next.js App Router entry point (`page.js`, `layout.js`, and `globals.css`).
- **`src/components/`**:
  - `TreemapView.jsx`: D3.js hierarchical treemap with category coloring, drill-down zooming, and spotlight dimming.
  - `DaisyDiskSunburstView.jsx`: Multi-ring concentric radial partition polar chart with live radar HUD.
  - `BeforeAfterTreeView.jsx`: Split-view tree comparison displaying physical vs. proposed folder states.
  - `FilePreviewModal.jsx`: In-app universal previewer for images, video, audio, PDFs, Word, PowerPoint, CSV, code, and hex dumps with local Qwen 2.5 AI summarization.
  - `ChatDrawer.jsx`: Collapsible workspace terminal chat powered by local Qwen 2.5 (1.5B) via Ollama.
  - `Navbar.jsx`: Control room header featuring real-time Chaos score gauge and Ollama model status pill.
  - `CommandPaletteModal.jsx`: Global search (`Ctrl+K`) with size/type filters and treemap spotlighting.
  - `DuplicateClustersView.jsx`: Clustered duplicate comparison with 1-click keep strategies.
  - `PlanReviewModal.jsx`: Reorganization dry-run summary with per-op approval toggles.
  - `JournalHistoryView.jsx`: Append-only transaction audit log with 1-click single-op, batch, or total undo.
- **`src/api.js`**: Centralized API abstraction communicating with the FastAPI backend.
- **`next.config.mjs`**: Configures dev origin security and reverse-proxies `/fs/*`, `/workspaces/*`, `/jobs/*`, and `/api/*` to `http://127.0.0.1:8000`.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run development server on port 3000
npm run dev -- -p 3000

# Build optimized production bundle
npm run build
```
