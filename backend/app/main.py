from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router, telegram_router
from .config import get_settings
from .database import Base, engine
from .services.collector import GoldPriceCollector

logger = logging.getLogger("gold-price-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Ensure database schema exists. For production, prefer Alembic migrations.
    Base.metadata.create_all(bind=engine)

    collector = GoldPriceCollector()
    app.state.collector = collector

    await collector.start()
    logger.info("Gold price collector started.")
    try:
        yield
    finally:
        await collector.stop()
        logger.info("Gold price collector stopped.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Gold Price Service",
        description="High-frequency gold price collector and API.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api")
    app.include_router(telegram_router, prefix="/api")

    return app


app = create_app()

