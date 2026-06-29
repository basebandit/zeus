"""
Event handlers for processing consumed order events.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.db.session import AsyncSessionLocal
from app.events.rabbitmq import rabbitmq_service
from app.events.schemas import (
    OrderCancelledEvent,
    OrderConfirmedEvent,
    ShipmentCreatedEvent,
    ShipmentShippedEvent,
)
from app.services.shipping_service import ShippingService

logger = logging.getLogger(__name__)


async def handle_order_event(event_data: dict[str, Any]) -> None:
    """Dispatch consumed order events by their eventType."""
    event_type = event_data.get("eventType")
    if event_type == "order.confirmed":
        await _handle_order_confirmed(event_data)
    elif event_type == "order.cancelled":
        await _handle_order_cancelled(event_data)
    else:
        logger.warning(f"Ignoring unexpected event type: {event_type}")


async def _handle_order_confirmed(event_data: dict[str, Any]) -> None:
    event = OrderConfirmedEvent(**event_data)
    logger.info(f"Processing order.confirmed for order {event.order_id}")

    async with AsyncSessionLocal() as session:
        service = ShippingService(session)
        try:
            shipment = await service.create_shipment(
                order_id=event.order_id,
                user_id=event.user_id,
                address=event.shipping_address,
            )
            await rabbitmq_service.publish_shipment_created(
                ShipmentCreatedEvent(
                    shipmentId=shipment.id,
                    orderId=shipment.order_id,
                    userId=shipment.user_id,
                    status=shipment.status,
                    timestamp=datetime.now(timezone.utc),
                )
            )

            # Simulate fulfillment: pack and dispatch immediately.
            await service.mark_shipped(shipment)
            await session.commit()

            await rabbitmq_service.publish_shipment_shipped(
                ShipmentShippedEvent(
                    shipmentId=shipment.id,
                    orderId=shipment.order_id,
                    userId=shipment.user_id,
                    trackingNumber=str(shipment.tracking_number),
                    carrier=shipment.carrier,
                    timestamp=datetime.now(timezone.utc),
                )
            )
            logger.info(
                f"Shipment {shipment.id} shipped for order {event.order_id} "
                f"(tracking {shipment.tracking_number})"
            )
        except Exception:
            await session.rollback()
            raise


async def _handle_order_cancelled(event_data: dict[str, Any]) -> None:
    event = OrderCancelledEvent(**event_data)
    logger.info(f"Processing order.cancelled for order {event.order_id}")

    async with AsyncSessionLocal() as session:
        service = ShippingService(session)
        try:
            shipment = await service.cancel_by_order(event.order_id)
            await session.commit()
            if shipment is not None:
                logger.info(
                    f"Shipment {shipment.id} for order {event.order_id} -> {shipment.status}"
                )
        except Exception:
            await session.rollback()
            raise
