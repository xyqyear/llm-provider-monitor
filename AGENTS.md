# Repository Guidelines

## Project Structure & Module Organization
- `backend/app/` contains the FastAPI service. Key layers: `api/` (routes), `services/` (business logic), `checker/` (HTTP probe checks), `scheduler/` (background probing), `models/` (SQLAlchemy ORM), `schemas/` (Pydantic v2).
- `backend/run.py` is the dev entrypoint; `backend/data/monitor.db` is the default SQLite database location.
- `frontend/src/` contains the React + TypeScript app with `pages/`, `components/`, `api/`, `hooks/`, and `types/`.
- `frontend/public/` holds static assets; `frontend/dist/` is the production build output when generated.

## Build, Test, and Development Commands
```bash
cd backend
uv sync                         # Install backend deps from uv.lock
uv run python run.py            # Run FastAPI dev server (localhost:8000)
uv run uvicorn app.main:app --reload  # Alternate dev server

cd frontend
pnpm install                    # Install frontend deps
pnpm run dev                    # Vite dev server (localhost:5173)
pnpm run build                  # Typecheck + production build (always run after making changes)
```

## Coding Style & Naming Conventions
- Python follows 4-space indentation; keep async/await patterns consistent with existing services and APIs.
- TypeScript/React uses 2-space indentation and Tailwind utility classes. Components are `PascalCase` (e.g., `StatusTable.tsx`); hooks are `useX` (e.g., `useAuth.tsx`).
- No repo-wide formatter config is present; match surrounding style when editing.

## Testing Guidelines
- No automated test framework or coverage gates are configured in this repo yet.
- If you add tests, document the runner and command in this file and in `backend/README.md` or `frontend/package.json`, and keep naming consistent (e.g., `*.test.tsx` for React).

## Commit & Pull Request Guidelines
- Git history uses Conventional Commits with optional scopes: `feat(dashboard): ...`, `fix(StatusTable): ...`, `refactor: ...`.
- PRs should include a short summary, testing notes, and screenshots for UI changes. Link related issues and call out config/db changes.

## Security & Configuration Tips
- Backend reads `.env` values via `backend/app/config.py`; default CORS origins are localhost.
- Admin auth uses an `X-Admin-Password` header backed by the `GlobalConfig` table; keep secrets out of commits.
- UI text is in Simplified Chinese; keep copy changes consistent with existing language.
