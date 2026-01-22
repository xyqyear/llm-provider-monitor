FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack prepare pnpm@9.12.3 --activate
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

FROM ghcr.io/astral-sh/uv:python3.13-alpine AS backend-venv
WORKDIR /app/backend

ENV VIRTUAL_ENV=/app/backend/.venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV UV_LINK_MODE=copy

RUN apk add --no-cache build-base libffi-dev openssl-dev

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv venv /app/backend/.venv
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

FROM python:3.13-alpine AS runtime
WORKDIR /app

ENV VIRTUAL_ENV=/app/backend/.venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

RUN apk add --no-cache libffi openssl libstdc++ libgcc

COPY --from=backend-venv /app/backend/.venv /app/backend/.venv
COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8000
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
