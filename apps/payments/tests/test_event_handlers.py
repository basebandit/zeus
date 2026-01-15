"""
Unit tests for Event Handlers.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.schemas import InventoryReservedEvent, ReservedInventoryItem
from app.models.payment import PaymentStatus
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
async def test_handle_inventory_reserved_success(
    test_db_session: AsyncSession, monkeypatch
):
    """Test handling inventory.reserved event with successful payment."""
    # Mock gateway to succeed
    async def mock_process(*args, **kwargs):
        return PaymentResult(
            success=True,
            transaction_id="test-txn-success",
            error_code=None,
            error_message=None,
        )

    monkeypatch.setattr(PaymentGateway, "process_payment", mock_process)

    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    order_id = uuid4()
    user_id = uuid4()

    # Create payment
    payment = await service.create_payment(
        order_id=order_id,
        user_id=user_id,
        amount=Decimal("99.99"),
        currency="USD",
        payment_method="credit_card",
        metadata={
            "reservation_id": str(uuid4()),
            "items": [{"productId": str(uuid4()), "quantity": 2}],
        },
    )

    # Process payment
    result = await service.process_payment(payment)

    assert result.success is True
    assert payment.status == PaymentStatus.COMPLETED
    assert payment.payment_gateway_id == "test-txn-success"


@pytest.mark.asyncio
async def test_handle_inventory_reserved_failure(
    test_db_session: AsyncSession, monkeypatch
):
    """Test handling inventory.reserved event with failed payment."""
    # Mock gateway to fail
    async def mock_process(*args, **kwargs):
        return PaymentResult(
            success=False,
            transaction_id=None,
            error_code="CARD_DECLINED",
            error_message="Card was declined",
        )

    monkeypatch.setattr(PaymentGateway, "process_payment", mock_process)

    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    order_id = uuid4()
    user_id = uuid4()

    # Create payment
    payment = await service.create_payment(
        order_id=order_id,
        user_id=user_id,
        amount=Decimal("99.99"),
        currency="USD",
        payment_method="credit_card",
    )

    # Process payment
    result = await service.process_payment(payment)

    assert result.success is False
    assert payment.status == PaymentStatus.FAILED
    assert payment.error_code == "CARD_DECLINED"


@pytest.mark.asyncio
async def test_payment_completed_event_publishing():
    """Test that payment.completed event is properly structured."""
    from app.events.schemas import PaymentCompletedEvent

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


@pytest.mark.asyncio
async def test_payment_failed_event_publishing():
    """Test that payment.failed event is properly structured."""
    from app.events.schemas import PaymentFailedEvent

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
