from fastapi import APIRouter

from .config import router as config_router
from .models import router as models_router
from .probe import router as probe_router
from .providers import router as providers_router
from .status import router as status_router
from .templates import router as templates_router

api_router = APIRouter()

api_router.include_router(providers_router, prefix="/providers", tags=["providers"])
api_router.include_router(models_router, prefix="/models", tags=["models"])
api_router.include_router(status_router, prefix="/status", tags=["status"])
api_router.include_router(probe_router, prefix="/probe", tags=["probe"])
api_router.include_router(config_router, prefix="/config", tags=["config"])
api_router.include_router(templates_router, prefix="/templates", tags=["templates"])
