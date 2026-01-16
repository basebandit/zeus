"""
Event schemas for RabbitMQ communication.
Defines DTOs for consumed and published events.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


# ============================================================================
# Consumed Events (from other services)
# ============================================================================


class ReservedInventoryItem(BaseModel):
    """Item in inventory reservation."""

    model_config = ConfigDict(populate_by_name=True)

    product_id: UUID = Field(alias="productId")
    quantity: int


class InventoryReservedEvent(BaseModel):
    """
    Event published by Inventory service when stock is successfully reserved.
    Payment service consumes this to process payment.
    """

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["inventory.reserved"] = Field(alias="eventType")
    order_id: UUID = Field(alias="orderId")
    reservation_id: UUID = Field(alias="reservationId")
    items: List[ReservedInventoryItem]
    # Additional fields from order that we need for payment
    user_id: UUID = Field(alias="userId")
    total_amount: Decimal = Field(alias="totalAmount")
    currency: str = "USD"
    payment_method: str = Field(default="credit_card", alias="paymentMethod")
    timestamp: datetime


# ============================================================================
# Published Events (to other services)
# ============================================================================


class PaymentCompletedEvent(BaseModel):
    """
    Event published when payment is successfully processed.
    Orders service consumes this to confirm the order.
    """

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["payment.completed"] = Field(
        default="payment.completed", alias="eventType"
    )
    order_id: UUID = Field(alias="orderId")
    payment_id: UUID = Field(alias="paymentId")
    user_id: UUID = Field(alias="userId")
    amount: Decimal
    currency: str
    payment_method: str = Field(alias="paymentMethod")
    payment_gateway_id: Optional[str] = Field(default=None, alias="paymentGatewayId")
    timestamp: datetime = Field(default_factory=_utc_now)


class PaymentFailedEvent(BaseModel):
    """
    Event published when payment processing fails.
    Orders service consumes this to cancel the order.
    """

    model_config = ConfigDict(populate_by_name=True)

    event_type: Literal["payment.failed"] = Field(
        default="payment.failed", alias="eventType"
    )
    order_id: UUID = Field(alias="orderId")
    user_id: UUID = Field(alias="userId")
    amount: Decimal
    currency: str
    reason: str
    error_code: Optional[str] = Field(default=None, alias="errorCode")
    timestamp: datetime = Field(default_factory=_utc_now)
