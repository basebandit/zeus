"""
Payment Service - FastAPI Application
Microservice for processing payments in the Zeus e-commerce platform.
"""

import asyncio
import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, payments
from app.config import settings
from app.events.consumer import start_consumer
from app.events.handlers import handle_inventory_reserved
from app.events.rabbitmq import rabbitmq_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.app_name} service...")

    # Connect to RabbitMQ for publishing
    await rabbitmq_service.connect()

    # Start event consumer in background
    consumer_task = asyncio.create_task(start_consumer(handle_inventory_reserved))

    logger.info(f"{settings.app_name} service started successfully")
    logger.info(f"Listening on {settings.host}:{settings.port}")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.app_name} service...")

    # Cancel consumer task
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass

    # Disconnect from RabbitMQ
    await rabbitmq_service.disconnect()

    logger.info(f"{settings.app_name} service stopped")


# Create FastAPI app
app = FastAPI(
    title="Payment Service",
    description="Microservice for processing payments in Zeus e-commerce platform",
    version="2.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(payments.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.app_name,
        "version": "2.1.0",
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
