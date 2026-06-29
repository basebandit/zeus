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
from app.events.schemas import PaymentCompletedEvent, PaymentFailedEvent

logger = logging.getLogger(__name__)


class RabbitMQService:
    """
    RabbitMQ connection manager and event publisher.
    Manages connection lifecycle and provides methods to publish events.
    """

    def __init__(self):
        """Initialize RabbitMQ service."""
        self.connection: Optional[AbstractConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.exchange: Optional[AbstractExchange] = None
        self.exchange_name = settings.rabbitmq_exchange
        self.rabbitmq_url = settings.rabbitmq_url

    async def connect(self):
        """
        Establish connection to RabbitMQ and set up exchange.
        Creates a durable topic exchange for event publishing.
        """
        try:
            # Connect to RabbitMQ
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()

            # Declare exchange (topic exchange for routing)
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
        """Close RabbitMQ connection."""
        if self.connection:
            await self.connection.close()
            logger.info("Disconnected from RabbitMQ")

    async def publish_event(self, routing_key: str, event: dict):
        """
        Publish an event to the exchange.

        Args:
            routing_key: Routing key for the event (e.g., 'payment.completed')
            event: Event data as dictionary

        Raises:
            RuntimeError: If not connected to RabbitMQ
        """
        if not self.exchange:
            raise RuntimeError("Not connected to RabbitMQ. Call connect() first.")

        message = Message(
            body=json.dumps(event, default=str).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            content_type="application/json",
        )

        await self.exchange.publish(
            message=message,
            routing_key=routing_key,
        )

        logger.info(f"Published event: {routing_key}")
        logger.debug(f"Event data: {event}")

    async def publish_payment_completed(self, event: PaymentCompletedEvent):
        """
        Publish payment.completed event.

        Args:
            event: Payment completed event data
        """
        await self.publish_event(
            routing_key="payment.completed",
            event=event.model_dump(mode="json", by_alias=True),
        )

    async def publish_payment_failed(self, event: PaymentFailedEvent):
        """
        Publish payment.failed event.

        Args:
            event: Payment failed event data
        """
        await self.publish_event(
            routing_key="payment.failed",
            event=event.model_dump(mode="json", by_alias=True),
        )


# Global instance
rabbitmq_service = RabbitMQService()
