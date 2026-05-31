"""
RabbitMQ connection management and event publishing.
"""

import json
import logging
from typing import Optional

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractChannel, AbstractConnection, AbstractExchange

from app.config import settings
from app.events.schemas import (
    ShipmentCreatedEvent,
    ShipmentDeliveredEvent,
    ShipmentShippedEvent,
)

logger = logging.getLogger(__name__)


class RabbitMQService:
    """Manages the RabbitMQ connection and publishes shipment events."""

    def __init__(self):
        self.connection: Optional[AbstractConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.exchange: Optional[AbstractExchange] = None
        self.exchange_name = settings.rabbitmq_exchange
        self.rabbitmq_url = settings.rabbitmq_url

    async def connect(self):
        try:
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )
            logger.info(f"Connected to RabbitMQ at {self.rabbitmq_url}")
            logger.info(f"Exchange '{self.exchange_name}' declared")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise

    async def disconnect(self):
        if self.connection:
            await self.connection.close()
            logger.info("Disconnected from RabbitMQ")

    async def publish_event(self, routing_key: str, event: dict):
        if not self.exchange:
            raise RuntimeError("Not connected to RabbitMQ. Call connect() first.")

        message = Message(
            body=json.dumps(event, default=str).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            content_type="application/json",
        )
        await self.exchange.publish(message=message, routing_key=routing_key)
        logger.info(f"Published event: {routing_key}")
        logger.debug(f"Event data: {event}")

    async def publish_shipment_created(self, event: ShipmentCreatedEvent):
        await self.publish_event("shipment.created", event.model_dump(mode="json", by_alias=True))

    async def publish_shipment_shipped(self, event: ShipmentShippedEvent):
        await self.publish_event("shipment.shipped", event.model_dump(mode="json", by_alias=True))

    async def publish_shipment_delivered(self, event: ShipmentDeliveredEvent):
        await self.publish_event("shipment.delivered", event.model_dump(mode="json", by_alias=True))


# Global instance
rabbitmq_service = RabbitMQService()
