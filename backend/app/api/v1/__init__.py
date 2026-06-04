"""v1 API routers."""

from fastapi import APIRouter

from app.api.v1 import auth, chat, council, debate, games, memory, onboarding, voice

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(council.router)
api_router.include_router(chat.router)
api_router.include_router(debate.router)
api_router.include_router(games.router)
api_router.include_router(memory.router)
api_router.include_router(voice.router)

__all__ = ["api_router"]
