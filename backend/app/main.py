import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .api import api_router
from .config import settings
from .database import init_db
from .scheduler.probe_scheduler import scheduler
from .schemas.common import HealthCheckResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    await init_db()
    await scheduler.start()
    yield
    # Shutdown
    logger.info("Shutting down...")
    await scheduler.stop()


app = FastAPI(
    title="LLM Provider Monitor",
    description="LLM中转商状态监测平台",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router, prefix="/api")


@app.get("/api/health", response_model=HealthCheckResponse)
async def health_check():
    return HealthCheckResponse(status="ok")


# Serve frontend build and SPA fallback
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
templates = Jinja2Templates(directory=str(frontend_dist))

app.mount(
    "/static",
    StaticFiles(directory=str(frontend_dist / "static")),
    name="static",
)
app.mount(
    "/assets",
    StaticFiles(directory=str(frontend_dist / "assets")),
    name="assets",
)


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(request: Request, full_path: str):
    return templates.TemplateResponse("index.html", {"request": request})
