"""
Unit tests for Event Handlers and Event Schemas.

Tests event schema validation and serialization without database dependencies.
"""

from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.events.schemas import (
    InventoryReservedEvent,
    ReservedInventoryItem,
    PaymentCompletedEvent,
    PaymentFailedEvent,
)
from app.models.payment import Payment, PaymentStatus
from app.services.payment_gateway import PaymentGateway, PaymentResult
from app.services.payment_service import PaymentService


@pytest.mark.asyncio
async def test_inventory_reserved_event_schema():
    """Test InventoryReservedEvent schema validation."""
    event = InventoryReservedEvent(
        eventType="inventory.reserved",
        orderId=uuid4(),
        reservationId=uuid4(),
        items=[
            ReservedInventoryItem(
                productId=uuid4(),
                quantity=2,
            )
        ],
        userId=uuid4(),
        totalAmount=Decimal("99.99"),
        currency="USD",
        paymentMethod="credit_card",
        timestamp="2026-01-15T10:00:00Z",
    )

    assert event.event_type == "inventory.reserved"
    assert event.total_amount == Decimal("99.99")
    assert len(event.items) == 1


@pytest.mark.asyncio
async def test_handle_inventory_reserved_success(mock_db_session, sample_payment):
    """Test handling inventory.reserved event with successful payment."""
    # Mock gateway to succeed
    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.process_payment.return_value = PaymentResult(
        success=True,
        gateway_transaction_id="test-txn-success",
        error_code=None,
        error_message=None,
    )

    service = PaymentService(mock_db_session, mock_gateway)

    # Process payment
    result = await service.process_payment(sample_payment)

    assert result.success is True
    assert sample_payment.status == PaymentStatus.COMPLETED
    assert sample_payment.payment_gateway_id == "test-txn-success"


@pytest.mark.asyncio
async def test_handle_inventory_reserved_failure(mock_db_session, sample_payment):
    """Test handling inventory.reserved event with failed payment."""
    # Mock gateway to fail
    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.process_payment.return_value = PaymentResult(
        success=False,
        gateway_transaction_id=None,
        error_code="CARD_DECLINED",
        error_message="Card was declined",
    )

    service = PaymentService(mock_db_session, mock_gateway)

    # Process payment
    result = await service.process_payment(sample_payment)

    assert result.success is False
    assert sample_payment.status == PaymentStatus.FAILED
    assert sample_payment.error_code == "CARD_DECLINED"


@pytest.mark.asyncio
async def test_payment_completed_event_publishing():
    """Test that payment.completed event is properly structured."""
    event = PaymentCompletedEvent(
        orderId=uuid4(),
        paymentId=uuid4(),
        userId=uuid4(),
        amount=Decimal("99.99"),
        currency="USD",
        paymentMethod="credit_card",
        paymentGatewayId="test-txn-123",
    )

    assert event.event_type == "payment.completed"
    assert event.amount == Decimal("99.99")

    # Test serialization with camelCase
    data = event.model_dump(by_alias=True, mode="json")
    assert "orderId" in data
    assert "paymentId" in data
    assert "userId" in data
    assert "paymentGatewayId" in data
    assert data["eventType"] == "payment.completed"


@pytest.mark.asyncio
async def test_payment_failed_event_publishing():
    """Test that payment.failed event is properly structured."""
    event = PaymentFailedEvent(
        orderId=uuid4(),
        userId=uuid4(),
        amount=Decimal("99.99"),
        currency="USD",
        reason="Insufficient funds",
        errorCode="INSUFFICIENT_FUNDS",
    )

    assert event.event_type == "payment.failed"
    assert event.reason == "Insufficient funds"
    assert event.error_code == "INSUFFICIENT_FUNDS"

    # Test serialization with camelCase
    data = event.model_dump(by_alias=True, mode="json")
    assert "orderId" in data
    assert "userId" in data
    assert "errorCode" in data
    assert data["eventType"] == "payment.failed"


@pytest.mark.asyncio
async def test_reserved_inventory_item_schema():
    """Test ReservedInventoryItem schema."""
    item = ReservedInventoryItem(
        productId=uuid4(),
        quantity=5,
    )

    assert item.quantity == 5
    data = item.model_dump(by_alias=True, mode="json")
    assert "productId" in data
    assert data["quantity"] == 5


@pytest.mark.asyncio
async def test_inventory_reserved_event_serialization():
    """Test that inventory.reserved event serializes correctly."""
    order_id = uuid4()
    reservation_id = uuid4()
    product_id = uuid4()
    user_id = uuid4()

    event = InventoryReservedEvent(
        eventType="inventory.reserved",
        orderId=order_id,
        reservationId=reservation_id,
        items=[
            ReservedInventoryItem(productId=product_id, quantity=3)
        ],
        userId=user_id,
        totalAmount=Decimal("149.99"),
        timestamp="2026-01-15T12:00:00Z",
    )

    data = event.model_dump(by_alias=True, mode="json")

    assert data["eventType"] == "inventory.reserved"
    assert data["orderId"] == str(order_id)
    assert data["reservationId"] == str(reservation_id)
    assert data["userId"] == str(user_id)
    assert data["totalAmount"] == "149.99"
    assert len(data["items"]) == 1
    assert data["items"][0]["productId"] == str(product_id)
    assert data["items"][0]["quantity"] == 3
