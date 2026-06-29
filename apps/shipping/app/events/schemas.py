"""
Event schemas for RabbitMQ communication.
Defines DTOs for consumed and published events.
"""

from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ============================================================================
# Consumed Events (from the orders service)
# ============================================================================


class OrderConfirmedEvent(BaseModel):
    """Published by Orders once payment completes. Shipping creates a shipment."""

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["order.confirmed"] = Field(alias="eventType")
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    payment_id: Optional[UUID] = Field(default=None, alias="paymentId")
    shipping_address: Optional[dict[str, Any]] = Field(
        default=None, alias="shippingAddress"
    )
    timestamp: datetime


class OrderCancelledEvent(BaseModel):
    """Published by Orders when an order is cancelled. Shipping cancels the shipment."""

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["order.cancelled"] = Field(alias="eventType")
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    reason: Optional[str] = None
    timestamp: datetime


# ============================================================================
# Published Events (to other services)
# ============================================================================


class ShipmentCreatedEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["shipment.created"] = Field(
        default="shipment.created", alias="eventType"
    )
    shipment_id: UUID = Field(alias="shipmentId")
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    status: str
    timestamp: datetime = Field(default_factory=_utc_now)


class ShipmentShippedEvent(BaseModel):
    """Consumed by Orders to advance the order to 'shipped'."""

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["shipment.shipped"] = Field(
        default="shipment.shipped", alias="eventType"
    )
    shipment_id: UUID = Field(alias="shipmentId")
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    tracking_number: str = Field(alias="trackingNumber")
    carrier: Optional[str] = None
    timestamp: datetime = Field(default_factory=_utc_now)


class ShipmentDeliveredEvent(BaseModel):
    """Consumed by Orders to advance the order to 'delivered'."""

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["shipment.delivered"] = Field(
        default="shipment.delivered", alias="eventType"
    )
    shipment_id: UUID = Field(alias="shipmentId")
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    timestamp: datetime = Field(default_factory=_utc_now)
