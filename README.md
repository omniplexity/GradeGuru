# GradeGuru

<p align="center">
  <img src="build/icon.png" alt="GradeGuru logo" width="128" height="128" />
</p>

<p align="center">
  <a href="https://github.com/omniplexity/GradeGuru/releases">
    <img src="https://img.shields.io/github/v/release/omniplexity/GradeGuru" alt="Latest release" />
  </a>
  <a href="https://github.com/omniplexity/GradeGuru/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/omniplexity/GradeGuru" alt="License" />
  </a>
  <a href="https://github.com/omniplexity/GradeGuru/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/omniplexity/GradeGuru/ci.yml" alt="CI status" />
  </a>
</p>

GradeGuru is a Windows Electron desktop workspace for assignment-centered AI help. The `2.0.0` line ships a modular main-process/backend architecture, assignment and chat workspaces, source ingestion with retrieval support, and built-in study tools for drafting and rubric-guided workflows.

## What ships in 2.0.0

- Assignment dashboard with seeded academic projects for first-run onboarding
- Class, assignment, source, and chat persistence backed by SQLite
- Modular AI routing with offline fallback plus provider stubs for LM Studio, Ollama, Groq, Together, and OpenRouter
- Retrieval and reasoning helpers for assignment context, rubric checks, and draft iteration
- Built-in tools for math solving, citation formatting, rubric parsing, and image-based problem solving
- Windows installer and portable builds produced by `electron-builder`

## Quick Start

### Prerequisites

- Windows 10 or Windows 11
- Node.js 18+ or 20+
- npm 9+

### Run locally

```bash
git clone https://github.com/omniplexity/GradeGuru.git
cd GradeGuru
npm install
npm run dev
```

### Validate and package

```bash
npm run lint
npm test -- --runInBand
npm run build
```

Build artifacts are written to `dist/`.

## Environment Variables

Create a local `.env` file if you want to connect cloud providers:

```bash
OPENROUTER_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
```

The committed example file is `.env.example`.

## Project Shape

- `src/main/`: Electron main process, preload bridge, IPC registration, window lifecycle
- `src/backend/`: storage, retrieval, AI routing, tools, plugins, and vision helpers
- `src/renderer/`: modular renderer shell, pages, layout, and assignment/chat/tool UI
- `tests/`: Jest coverage for baseline units and the v2 workflow path
- `plugins/example-plugin/`: reference plugin manifest and implementation

## Releases

Download packaged builds from the [GitHub Releases page](https://github.com/omniplexity/GradeGuru/releases).

- Installer: `GradeGuru-Setup-<version>.exe`
- Portable: `GradeGuru-<version>-portable.exe`

## Development Notes

- `npm run lint` is a required CI gate.
- `npm test -- --runInBand` matches the release validation command used locally.
- `npm run build` produces the release artifacts used for tagging and GitHub releases.

Additional design and architecture notes live in `docs/architecture.md`, `docs/development-guide.md`, and `docs/plugin-system.md`.
