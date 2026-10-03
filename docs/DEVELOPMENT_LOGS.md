# FolderPilot — Development & Architecture History

This document consolidates the engineering roadmap, architectural decisions, and verification records achieved during the initial development cycle of **FolderPilot**.

---

## 1. Project Inception & Goals

FolderPilot was conceived to solve the desktop problem of digital clutter—messy download folders, disorganized projects, and cluttered workspaces—without the privacy risks of cloud uploaders or the dangers of destructive auto-cleanup tools.

### Key Requirements
- **Non-Destructive**: Zero `unlink`, `remove`, `delete`, or truncation code paths exist in the application.
- **Atomic Journaling & Rollback**: Every file move or rename is recorded in an append-only transaction journal before disk execution.
- **Deterministic Auto-Suffixing**: Name collisions are automatically resolved (`file (1).ext`) to ensure files are never overwritten.
- **Hardware-Friendly**: Designed to run smoothly on standard consumer hardware (multi-core CPU, 8 GB RAM, no GPU required).
- **Local AI Intelligence**: Powered by Ollama with on-device models (defaulting to Gemma 3 1B with fallback to Qwen 2.5 1.5B) for privacy-preserving classification, summarization, and chat.

---

## 2. Engineering Milestones

### Phase 1: Specifications & Safety Guardrails
- Analyzed complete Software Requirements Specification (383 rules covering FR-01 through FR-103).
- Established core invariants (Zero Delete, Auto-Suffixing, Explicit User Gate, Reversible Journaling, Local-Only Privacy).

### Phase 2: Backend Core (FastAPI + SQLite WAL)
- Created SQLite database schema with ACID transaction support.
- Built safe file operations engine (`mkdir`, `move`, `rename` only).
- Implemented append-only rollback journal enabling batch, single-op, and full-workspace undos.
- Built background folder scanner with live Server-Sent Events (SSE) progress streaming.
- Developed 4-tier hierarchical classification engine:
  - **Tier 1**: Deterministic extension matching.
  - **Tier 2**: SHA-256 hash & perceptual image hash duplicate detection.
  - **Tier 3**: Prototype keyword matching against extracted text snippets.
  - **Tier 4**: Local LLM JSON schema classification via Ollama.

### Phase 3: Modern UI & Visualizations (Next.js 16 + React 19 + Tailwind CSS)
- **Interactive D3 Treemap**: Nested directory partition with zoom drill-down and spotlight search.
- **DaisyDisk Sunburst View**: Multi-ring concentric polar chart with real-time radial radar HUD.
- **Before & After Tree Comparison**: Split-tree visualizer showing proposed changes side-by-side.
- **Chaos Score Metric**: Algorithmic disorder score (0 to 100) computing entropy, root-level pollution, and duplicate ratios with real-time slider interpolation.
- **In-App Multi-Format File Previewer**: Supports images, video, audio streaming, dual-mode PDF viewer, formatted Word/PowerPoint document reader, CSV tabular grid, and low-level hex dump viewer.
- **Command Palette (`Ctrl+K`)**: Instant search with realtime treemap spotlight highlighting.
- **WanderingEyes Scanning State**: Animated center discovery state with live progress bar and cancellation.

### Phase 4: Quality Assurance & Audit
- Developed automated test suite (19 unit and integration tests passing).
- Verified zero-delete code paths and path traversal protection.
- Verified Next.js Turbopack build passes with zero errors.
