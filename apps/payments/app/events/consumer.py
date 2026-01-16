"""
RabbitMQ event consumer.
Consumes events from other services and delegates to handlers.
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Optional

import aio_pika
from aio_pika import ExchangeType, IncomingMessage
from aio_pika.abc import AbstractChannel, AbstractQueue, AbstractRobustConnection

from app.config import settings

logger = logging.getLogger(__name__)


class EventConsumer:
    """
    RabbitMQ event consumer.
    Subscribes to events and processes them with retry logic.
    """

    def __init__(self, rabbitmq_url: str, exchange_name: str):
        """
        Initialize event consumer.

        Args:
            rabbitmq_url: RabbitMQ connection URL
            exchange_name: Exchange name to consume from
        """
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange_name
        self.connection: Optional[AbstractRobustConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.queue: Optional[AbstractQueue] = None

    async def start(
        self, message_handler: Callable[[dict[str, Any]], Awaitable[None]]
    ) -> None:
        """
        Start consuming events.

        Args:
            message_handler: Async function to handle messages
        """
        try:
            # Connect to RabbitMQ
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()

            # Set QoS to process one message at a time
            await self.channel.set_qos(prefetch_count=1)

            # Declare exchange
            exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )

            # Declare queue
            self.queue = await self.channel.declare_queue(
                name="payments.inventory_events",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": self.exchange_name,
                    "x-dead-letter-routing-key": "payments.inventory_events.dlq",
                },
            )

            # Bind queue to exchange with routing key
            await self.queue.bind(exchange, routing_key="inventory.reserved")

            # Declare DLQ (Dead Letter Queue)
            dlq = await self.channel.declare_queue(
                name="payments.inventory_events.dlq",
                durable=True,
            )
            await dlq.bind(exchange, routing_key="payments.inventory_events.dlq")

            logger.info("Event consumer started, waiting for messages...")
            logger.info(f"Queue: {self.queue.name}")
            logger.info("Binding: inventory.reserved")

            # Start consuming
            await self.queue.consume(
                lambda msg: self._process_message(msg, message_handler)
            )

        except Exception as e:
            logger.error(f"Failed to start event consumer: {e}")
            raise

    async def _process_message(
        self,
        message: IncomingMessage,
        handler: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Process a single message with retry logic.

        Args:
            message: Incoming message from RabbitMQ
            handler: Handler function to process the message
        """
        async with message.process():
            try:
                # Get retry count from headers
                retry_count = 0
                if message.headers and "x-retry-count" in message.headers:
                    retry_count = message.headers["x-retry-count"]

                logger.info(f"Processing message (retry: {retry_count})")
                logger.debug(f"Message body: {message.body.decode()}")

                # Parse message
                event_data = json.loads(message.body.decode())

                # Call handler
                await handler(event_data)

                # Message processed successfully
                logger.info("Message processed successfully")

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)

                # Check retry count
                max_retries = 3
                retry_count = (
                    message.headers.get("x-retry-count", 0) if message.headers else 0
                )

                if retry_count < max_retries:
                    # Retry with delay
                    retry_count += 1
                    logger.warning(
                        f"Retrying message (attempt {retry_count}/{max_retries})"
                    )

                    # Publish message back to queue with incremented retry count
                    await self._retry_message(message, retry_count)
                else:
                    # Max retries exceeded, send to DLQ
                    logger.error("Max retries exceeded, sending to DLQ")
                    # Message will automatically go to DLQ on reject

                # Reject message (will go to DLQ if max retries exceeded)
                raise

    async def _retry_message(self, message: IncomingMessage, retry_count: int) -> None:
        """
        Retry a failed message by republishing with updated retry count.

        Args:
            message: Failed message
            retry_count: New retry count
        """
        try:
            if self.channel is None:
                raise RuntimeError("Channel not initialized")
            exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )

            # Create new message with updated retry count
            new_message = aio_pika.Message(
                body=message.body,
                headers={
                    **(message.headers or {}),
                    "x-retry-count": retry_count,
                },
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                content_type="application/json",
                expiration=60000,  # 60 seconds TTL
            )

            # Publish back to original routing key
            await exchange.publish(
                message=new_message,
                routing_key="inventory.reserved",
            )

            logger.info(f"Message requeued for retry {retry_count}")

        except Exception as e:
            logger.error(f"Failed to retry message: {e}")
            raise

    async def stop(self) -> None:
        """Stop consuming and close connection."""
        if self.connection:
            await self.connection.close()
            logger.info("Event consumer stopped")


async def start_consumer(handler: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
    """
    Start the event consumer.

    Args:
        handler: Message handler function
    """
    consumer = EventConsumer(
        rabbitmq_url=settings.rabbitmq_url,
        exchange_name=settings.rabbitmq_exchange,
    )

    await consumer.start(handler)

    # Keep running
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        await consumer.stop()
