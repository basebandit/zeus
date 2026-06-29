"""
Shipping Service - FastAPI Application
Order fulfillment microservice for the Zeus e-commerce platform.
"""

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, shipments
from app.config import settings
from app.events.consumer import start_consumer
from app.events.handlers import handle_order_event
from app.events.rabbitmq import rabbitmq_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(f"Starting {settings.app_name} service...")
    await rabbitmq_service.connect()
    consumer_task = asyncio.create_task(start_consumer(handle_order_event))
    logger.info(f"{settings.app_name} service started successfully")
    logger.info(f"Listening on {settings.host}:{settings.port}")

    yield

    logger.info(f"Shutting down {settings.app_name} service...")
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    await rabbitmq_service.disconnect()
    logger.info(f"{settings.app_name} service stopped")


app = FastAPI(
    title="Shipping Service",
    description="Order fulfillment and shipment tracking for Zeus e-commerce platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(shipments.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )
