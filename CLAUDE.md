# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Provider Monitor - A monitoring platform for tracking LLM API provider availability and performance. Backend is Python/FastAPI, frontend is React/TypeScript.

## Build & Run Commands

### Backend (Python)

```bash
cd backend
uv sync                    # Install dependencies
uv run python run.py       # Run dev server (localhost:8000)
uv run uvicorn app.main:app --reload  # Alternative
```

### Frontend (React)

```bash
cd frontend
pnpm install                # Install dependencies
pnpm run dev                # Dev server (localhost:5173)
pnpm run build              # Production build
pnpm exec tsc               # TypeScript/ESLint check
```

API docs available at `http://localhost:8000/docs` when backend is running.

## Architecture

### Backend (`backend/app/`)

- **FastAPI** with async/await throughout
- **SQLAlchemy 2.0** async with SQLite (aiosqlite)
- **Pydantic v2** for schemas

Key layers:

- `api/` - Route handlers with dependency injection
- `services/` - Business logic (ProbeService, StatusService, CleanupService)
- `checker/` - HTTP checking abstraction (BaseChecker → HTTPXChecker)
- `scheduler/` - Background probe scheduler using heapq + asyncio.Semaphore
- `models/` - SQLAlchemy ORM models
- `schemas/` - Pydantic request/response schemas

### Frontend (`frontend/src/`)

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **React Router** for routing

Key structure:

- `pages/` - Page components (Dashboard, Detail, Admin/\*)
- `components/` - Reusable UI components
- `api/` - API client modules per feature
- `hooks/` - Custom hooks (useAuth, usePolling)
- `types/` - TypeScript definitions

## Key Patterns

### Database Relationships

```text
RequestTemplate (1) ──── (N) Model
Provider (1) ────────── (N) ProviderModel (N) ──── (1) Model
Provider (1) ──────────── (N) ProbeHistory
```

### Request Templates

Templates use `{variable}` placeholders for dynamic values:

- `{key}` - Provider auth token
- `{model}` - Model name (with optional provider mapping)
- `{user_prompt}` - Check prompt
- `{system_prompt}` - System prompt

### Status Matching

StatusConfig entries matched by priority order against:

- `http_code_pattern` - Patterns like "200", "4xx", "5xx"
- `response_regex` - Regex against response text

### Admin Authentication

Admin routes use `Depends(verify_admin)` which checks password from `GlobalConfig` table (key: `admin_password`, stored in plaintext).

## Database

SQLite database at `backend/data/monitor.db`. Auto-created on first run with default data:

- 3 default models (cc-haiku, cc-sonnet, cc-opus)
- 1 default request template (Anthropic API format)
- 5 status configs (正常, 超时, 请求错误, 服务器错误, 未知)

## API Structure

All routes prefixed with `/api`:

- `/providers` - Provider CRUD
- `/models` - Model CRUD
- `/probe` - History, timeline, manual trigger
- `/status` - Status config CRUD + unmatched messages
- `/config` - Global configuration
- `/templates` - Request template CRUD

Admin endpoints require `X-Admin-Password` header.

## Language

UI text is in Chinese (简体中文).
