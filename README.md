# 🗂️ FolderPilot

> **Privacy-First, Local Intelligent Folder Organizer & Visual Analytics Workspace**  
> *Non-destructive file organization, interactive D3 visualizations, append-only rollback journaling, and local AI powered by Ollama (Qwen 2.5).*

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3%20(App%20Router)-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![D3.js](https://img.shields.io/badge/D3.js-v7-F9A03C.svg?logo=d3.js&logoColor=white)](https://d3js.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama%20%7C%20Qwen%202.5-white.svg?logo=ollama&logoColor=black)](https://ollama.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Safety](https://img.shields.io/badge/Safety%20Invariant-Zero%20Delete-emerald.svg)](#-ironclad-safety-guarantees)

---

## 🌟 Overview

**FolderPilot** transforms messy, disorganized directories (like your `Downloads`, `Desktop`, or chaotic project folders) into clean, structured environments. Unlike typical cleanup tools that silently delete files or upload private data to third-party cloud APIs, FolderPilot operates on three foundational pillars:

1. **🛡️ 100% Non-Destructive**: Zero `delete`, `unlink`, `remove`, or file truncation code paths exist anywhere in the application. Files are moved or renamed only with explicit user approval.
2. **🔒 Air-Gapped Privacy**: Everything runs on `127.0.0.1`. File contents, text snippets, and metadata never leave your local machine.
3. **⏪ Atomic Reversibility**: An append-only transaction journal records every single filesystem operation before disk execution, enabling instant 1-click single-op, batch, or total rollbacks.

---

## 🚀 Key Features

### 1. 📊 Interactive Visualizations
- **D3 Dynamic Treemap**: Hierarchical visualization of file weights and directory structures with smooth zoom drill-downs, breadcrumbs, and spotlight filtering.
- **DaisyDisk Sunburst View**: Concentric radial partition chart with live radar HUD showing size breakdowns at every depth.
- **Before & After Comparison Tree**: Side-by-side split visualizer demonstrating the exact proposed reorganization before any changes touch disk.

### 2. ⚡ Chaos Score & Real-Time Simulation
- Computes an algorithmic disorder metric (0 to 100) based on root-level clutter, unclassified files, nested depth imbalance, and duplicate ratios.
- **Interactive Simulation Slider (0% to 100%)**: Dynamically animates the transformation from current state to organized state while updating the projected Chaos Score in real time.

### 3. 🤖 Local AI Intelligence (Ollama + Qwen 2.5:1.5B)
- **4-Tier Classification Pipeline**:
  - **Tier 1**: Instant deterministic extension matching.
  - **Tier 2**: SHA-256 hash & perceptual image hash duplicate detection.
  - **Tier 3**: Prototype keyword matching on extracted text snippets.
  - **Tier 4 (Local LLM)**: Zero-cloud classification fallback using local **Qwen 2.5 (1.5B)** in constrained JSON mode.
- **Natural Language Folder Chat**: Talk directly with your folder—ask statistical questions (*"How many PDFs do I have?"*, *"What is taking up the most space?"*) or request reorganization ideas.
- **On-Demand Document Summarization**: Instant 3-part summaries (overview, key takeaways, tags) inside the previewer.

### 4. 🔍 In-App Universal File Previewer
Inspect contents securely without opening external desktop apps:
- **Images**: High-res preview with dimension badges and zoom.
- **Audio & Video**: Byte-range HTML5 streaming player (MP4, WEBM, MOV, MP3, WAV).
- **Documents**: Built-in document reader for Word (`.docx`, `.doc`) and PowerPoint (`.pptx`) extracting paragraphs and word counts.
- **PDFs**: Dual-mode visual PDF viewer + extracted text transcript via PyMuPDF.
- **Code & Text**: Monospace syntax viewer with line numbers and one-click copy.
- **Spreadsheets**: Interactive tabular data grid for CSV and TSV.
- **Binary Files**: Low-level Hex Dump inspector with byte offsets and Windows Explorer reveal.

### 5. 🔁 100% Rollback Audit Journal
- Every disk operation writes an atomic journal entry before executing.
- One-click rollback supports three scopes:
  - **Single Op**: Undo a specific file move or rename.
  - **Batch**: Undo an entire applied organization plan.
  - **Full Workspace**: Completely restore the workspace to its initial physical state.

---

## 🛡️ Ironclad Safety Guarantees

| Invariant | Guarantee |
| :--- | :--- |
| **Zero Delete** | No delete, truncate, or wipe APIs exist. Cleanup requests propose moving files to `_Review_Later/` instead. |
| **Deterministic Auto-Suffixing** | If a destination filename collides with an existing file, the engine automatically suffixes it: `Document (1).pdf`. No file is ever overwritten. |
| **Explicit User Gate** | Plans are generated in an unapproved `draft` status. Nothing touches disk until you review and confirm. |
| **Protected System Folders** | Critical OS folders (`C:\Windows`, `C:\Program Files`, root drives) are hard-shielded against scanning or reorganization. |

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │    FolderPilot Web UI (Next.js 16)      │
                    │   React 19 • Tailwind CSS • D3.js       │
                    └────────────────────┬────────────────────┘
                                         │ HTTP / SSE (127.0.0.1:8000)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FastAPI Backend Core                             │
│                                                                             │
│  ┌───────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │   Background Scanner  │  │ 4-Tier Classifier   │  │   Chat Engine     │  │
│  │   (SSE Progress Hub)  │  │ (Rules/Hash/Content)│  │   (SQL + Qwen 2.5)│  │
│  └───────────┬───────────┘  └──────────┬──────────┘  └─────────┬─────────┘  │
│              │                         │                       │            │
│              ▼                         ▼                       ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Safe File Operations Engine                        │  │
│  │            (mkdir, move, rename ONLY • auto-suffixing)                │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Writes atomic entries                 │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Append-Only Rollback Journal                      │  │
│  │                  (Full, Batch, and Single-Op Undo)                    │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     SQLite Database (WAL)     │             │       Local AI Service        │
│   files, ops, plans, journal  │             │   Ollama (Qwen 2.5:1.5b)      │
└───────────────────────────────┘             └───────────────────────────────┘
```

---

## 📁 Repository Structure

```
FolderPilot/
├── backend/                  # FastAPI Python backend engine
│   ├── app/                  # Application source code
│   │   ├── config.py         # App settings & environment overrides
│   │   ├── database.py       # SQLite connection manager & schema migrations
│   │   ├── models.py         # Pydantic request/response schemas
│   │   ├── main.py           # FastAPI routes & lifespan handlers
│   │   ├── scanner.py        # Background directory scanner & SSE stream
│   │   ├── classifier.py     # 4-tier hierarchical classification pipeline
│   │   ├── chaos_score.py    # Algorithmic disorder scoring engine
│   │   ├── planner.py        # Plan generation & dry-run simulation
│   │   ├── safe_ops.py       # Non-destructive file operation executor
│   │   ├── journal.py        # Append-only rollback journal & undo engine
│   │   ├── folder_browser.py # System directory browser with security shields
│   │   ├── sensitive.py      # Sensitive document pattern detection
│   │   ├── chat_engine.py    # Conversational chat router & SQLite memory
│   │   └── ollama_client.py  # Local Ollama client (Qwen 2.5:1.5b)
│   ├── tests/                # Automated pytest unit & integration test suite
│   │   ├── test_ai_ollama.py # AI status, model switching, summarization tests
│   │   ├── test_chat_engine.py # Safety refusal and SQL chat tests
│   │   ├── test_classifier.py  # Classification pipeline tests
│   │   ├── test_folder_browser.py # Directory traversal security tests
│   │   ├── test_journal_undo.py   # Atomic rollback and undo tests
│   │   ├── test_planner.py   # Plan generation & dry-run tests
│   │   └── test_safe_ops.py  # Zero-delete and auto-suffix collision tests
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js 16 App Router frontend client
│   ├── src/
│   │   ├── app/              # Next.js App Router entry & layouts
│   │   ├── components/       # Reusable UI & visualization components
│   │   │   ├── TreemapView.jsx           # D3 Treemap with drill-down zoom
│   │   │   ├── DaisyDiskSunburstView.jsx # Multi-ring polar radial sunburst
│   │   │   ├── BeforeAfterTreeView.jsx   # Split before/after tree comparison
│   │   │   ├── FilePreviewModal.jsx      # Multi-format previewer & AI summary
│   │   │   ├── ChatDrawer.jsx            # Qwen 2.5 conversational terminal
│   │   │   ├── Navbar.jsx                # Chaos gauge & live AI model pill
│   │   │   ├── CommandPaletteModal.jsx   # Spotlight filter (Ctrl+K)
│   │   │   ├── DuplicateClustersView.jsx # Cluster diff & keep strategies
│   │   │   ├── JournalHistoryView.jsx    # Audit journal & 1-click undo
│   │   │   ├── PlanReviewModal.jsx       # Dry-run review & approval drawer
│   │   │   └── StatsOverview.jsx         # Summary cards & distribution
│   │   ├── utils/            # Colors, byte formatters & helpers
│   │   └── api.js            # Client API fetch layer
│   ├── next.config.mjs       # Next.js configuration & backend proxy rewrites
│   └── package.json          # Node dependencies & build scripts
│
├── docs/                     # Technical documentation & specifications
│   ├── ARCHITECTURE.md       # Complete architectural blueprints & schema design
│   ├── REQUIREMENTS_SRS.md   # Software Requirements Specification (FR-01 to FR-103)
│   ├── AI_INTEGRATION.md     # Local Ollama & Qwen 2.5:1.5b technical manual
│   ├── API_REFERENCE.md      # REST & SSE endpoint reference
│   └── DEVELOPMENT_LOGS.md   # Chronological development logs & milestones
│
├── .gitignore                # Comprehensive Git ignore rules
├── LICENSE                   # MIT License
├── README.md                 # Project documentation & overview
└── run.bat                   # Windows one-click local launcher
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.11+ installed and on PATH
- **Node.js**: 18+ (Node 20+ recommended)
- **Ollama** *(Optional, for AI features)*: Installed from [ollama.com](https://ollama.com)

---

### Option A: Windows 1-Click Launcher (Recommended)
Simply double-click:
```cmd
.\run.bat
```
This automatically validates Python and Node.js environments and starts both the FastAPI backend and Next.js frontend in dedicated terminal windows.

---

### Option B: Manual Setup

#### 1. Start Ollama (Optional for AI)
```bash
ollama run qwen2.5:1.5b
```

#### 2. Start the Backend Server
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: **http://127.0.0.1:8000/docs**

#### 3. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
Open your browser at: **http://127.0.0.1:3000**

---

## 🧪 Testing & Verification

FolderPilot includes an automated test suite covering safety invariants, collision resolution, classification tiers, security guards, and rollback journaling:

```bash
cd backend
pytest -v
```

```
tests/test_ai_ollama.py::test_get_ai_status PASSED
tests/test_ai_ollama.py::test_set_ai_model PASSED
tests/test_ai_ollama.py::test_summarize_content PASSED
tests/test_chat_engine.py::test_chat_delete_refusal PASSED
tests/test_chat_engine.py::test_chat_counts PASSED
tests/test_classifier.py::test_rule_extension PASSED
tests/test_classifier.py::test_filename_keywords PASSED
tests/test_classifier.py::test_content_prototypes PASSED
tests/test_classifier.py::test_sensitive_detection PASSED
tests/test_folder_browser.py::test_browse_system_drives PASSED
tests/test_folder_browser.py::test_protected_path_block PASSED
tests/test_journal_undo.py::test_journal_and_undo PASSED
tests/test_planner.py::test_plan_and_dryrun PASSED
tests/test_safe_ops.py::test_no_delete_functions_exist PASSED
tests/test_safe_ops.py::test_auto_suffix_collision PASSED
tests/test_safe_ops.py::test_safe_move_file PASSED
tests/test_safe_ops.py::test_safe_rename_file PASSED

======================== 18 passed in 2.6s ========================
```

To build and validate the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: Add amazing feature'`).
4. Ensure all tests pass (`pytest` in `backend/` and `npm run build` in `frontend/`).
5. Push to the Branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
