"""
RabbitMQ event consumer.
Consumes order events and delegates to handlers, with retry + DLQ logic.
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Optional

import aio_pika
from aio_pika import ExchangeType
from aio_pika.abc import (
    AbstractChannel,
    AbstractIncomingMessage,
    AbstractQueue,
    AbstractRobustConnection,
)

from app.config import settings

logger = logging.getLogger(__name__)

QUEUE_NAME = "shipping.order_events"
DLQ_NAME = "shipping.order_events.dlq"
ROUTING_KEYS = ["order.confirmed", "order.cancelled"]
MAX_RETRIES = 3


class EventConsumer:
    """Subscribes to order events and processes them with retry logic."""

    def __init__(self, rabbitmq_url: str, exchange_name: str):
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange_name
        self.connection: Optional[AbstractRobustConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.queue: Optional[AbstractQueue] = None

    async def start(
        self, message_handler: Callable[[dict[str, Any]], Awaitable[None]]
    ) -> None:
        try:
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=1)

            exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )

            self.queue = await self.channel.declare_queue(
                name=QUEUE_NAME,
                durable=True,
                arguments={
                    "x-dead-letter-exchange": self.exchange_name,
                    "x-dead-letter-routing-key": DLQ_NAME,
                },
            )
            for routing_key in ROUTING_KEYS:
                await self.queue.bind(exchange, routing_key=routing_key)

            dlq = await self.channel.declare_queue(name=DLQ_NAME, durable=True)
            await dlq.bind(exchange, routing_key=DLQ_NAME)

            logger.info("Event consumer started, waiting for messages...")
            logger.info(f"Queue: {self.queue.name}")
            logger.info(f"Bindings: {', '.join(ROUTING_KEYS)}")

            await self.queue.consume(
                lambda msg: self._process_message(msg, message_handler)
            )
        except Exception as e:
            logger.error(f"Failed to start event consumer: {e}")
            raise

    async def _process_message(
        self,
        message: AbstractIncomingMessage,
        handler: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        async with message.process():
            try:
                retry_count = 0
                if message.headers and "x-retry-count" in message.headers:
                    retry_count = int(message.headers["x-retry-count"])  # type: ignore[arg-type]

                logger.info(f"Processing message (retry: {retry_count})")
                event_data = json.loads(message.body.decode())
                await handler(event_data)
                logger.info("Message processed successfully")
            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)

                header_value = (
                    message.headers.get("x-retry-count", 0) if message.headers else 0
                )
                retry_count = int(header_value)  # type: ignore[arg-type]

                if retry_count < MAX_RETRIES:
                    retry_count += 1
                    logger.warning(
                        f"Retrying message (attempt {retry_count}/{MAX_RETRIES})"
                    )
                    await self._retry_message(message, retry_count)
                else:
                    logger.error("Max retries exceeded, sending to DLQ")
                raise

    async def _retry_message(
        self, message: AbstractIncomingMessage, retry_count: int
    ) -> None:
        try:
            if self.channel is None:
                raise RuntimeError("Channel not initialized")
            exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )
            new_message = aio_pika.Message(
                body=message.body,
                headers={**(message.headers or {}), "x-retry-count": retry_count},
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                content_type="application/json",
                expiration=60000,
            )
            await exchange.publish(
                message=new_message,
                routing_key=message.routing_key or "order.confirmed",
            )
            logger.info(f"Message requeued for retry {retry_count}")
        except Exception as e:
            logger.error(f"Failed to retry message: {e}")
            raise

    async def stop(self) -> None:
        if self.connection:
            await self.connection.close()
            logger.info("Event consumer stopped")


async def start_consumer(handler: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
    consumer = EventConsumer(
        rabbitmq_url=settings.rabbitmq_url,
        exchange_name=settings.rabbitmq_exchange,
    )
    await consumer.start(handler)
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        await consumer.stop()
