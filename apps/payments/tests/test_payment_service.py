"""
Unit tests for Payment Service.

Uses mocking for database and gateway to test business logic in isolation.
"""

from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.payment import Payment, PaymentStatus
from app.services.payment_gateway import PaymentGateway, PaymentResult
from app.services.payment_service import PaymentService


@pytest.mark.asyncio
async def test_create_payment(mock_db_session, sample_payment_data):
    """Test creating a new payment."""
    gateway = PaymentGateway()
    service = PaymentService(mock_db_session, gateway)

    # Mock refresh to set the id on the payment
    async def mock_refresh(payment):
        payment.id = uuid4()

    mock_db_session.refresh = mock_refresh

    payment = await service.create_payment(
        order_id=sample_payment_data["order_id"],
        user_id=sample_payment_data["user_id"],
        amount=sample_payment_data["amount"],
        currency=sample_payment_data["currency"],
        payment_method=sample_payment_data["payment_method"],
    )

    assert payment.order_id == sample_payment_data["order_id"]
    assert payment.user_id == sample_payment_data["user_id"]
    assert payment.amount == sample_payment_data["amount"]
    assert payment.status == PaymentStatus.PENDING
    assert payment.currency == "USD"
    mock_db_session.add.assert_called_once()


@pytest.mark.asyncio
async def test_process_payment_success(mock_db_session, sample_payment):
    """Test successful payment processing."""
    # Mock gateway to always succeed
    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.process_payment.return_value = PaymentResult(
        success=True,
        gateway_transaction_id="test-txn-123",
        error_code=None,
        error_message=None,
    )

    service = PaymentService(mock_db_session, mock_gateway)

    result = await service.process_payment(sample_payment)

    assert result.success is True
    assert sample_payment.status == PaymentStatus.COMPLETED
    assert sample_payment.payment_gateway_id == "test-txn-123"
    mock_gateway.process_payment.assert_called_once()


@pytest.mark.asyncio
async def test_process_payment_failure(mock_db_session, sample_payment):
    """Test failed payment processing."""
    # Mock gateway to always fail
    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.process_payment.return_value = PaymentResult(
        success=False,
        gateway_transaction_id=None,
        error_code="INSUFFICIENT_FUNDS",
        error_message="Insufficient funds in account",
    )

    service = PaymentService(mock_db_session, mock_gateway)

    result = await service.process_payment(sample_payment)

    assert result.success is False
    assert sample_payment.status == PaymentStatus.FAILED
    assert sample_payment.error_code == "INSUFFICIENT_FUNDS"
    assert sample_payment.error_message == "Insufficient funds in account"


@pytest.mark.asyncio
async def test_process_payment_card_declined(mock_db_session, sample_payment):
    """Test payment declined by card issuer."""
    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.process_payment.return_value = PaymentResult(
        success=False,
        gateway_transaction_id=None,
        error_code="card_declined",
        error_message="Card was declined by the issuing bank",
    )

    service = PaymentService(mock_db_session, mock_gateway)
    result = await service.process_payment(sample_payment)

    assert result.success is False
    assert sample_payment.status == PaymentStatus.FAILED
    assert sample_payment.error_code == "card_declined"


@pytest.mark.asyncio
async def test_refund_payment_success(mock_db_session, sample_payment):
    """Test successful payment refund."""
    # Set up payment as completed
    sample_payment.status = PaymentStatus.COMPLETED
    sample_payment.payment_gateway_id = "original-txn-123"

    mock_gateway = AsyncMock(spec=PaymentGateway)
    mock_gateway.refund_payment.return_value = PaymentResult(
        success=True,
        gateway_transaction_id="refund-txn-456",
    )

    # Mock get_payment_by_id to return the sample payment
    service = PaymentService(mock_db_session, mock_gateway)
    service.get_payment_by_id = AsyncMock(return_value=sample_payment)

    result = await service.refund_payment(sample_payment.id)

    assert result.success is True
    assert sample_payment.status == PaymentStatus.REFUNDED
    mock_gateway.refund_payment.assert_called_once()


@pytest.mark.asyncio
async def test_refund_payment_not_completed(mock_db_session, sample_payment):
    """Test refund fails for non-completed payment."""
    # Payment is still pending
    sample_payment.status = PaymentStatus.PENDING

    mock_gateway = AsyncMock(spec=PaymentGateway)
    service = PaymentService(mock_db_session, mock_gateway)
    service.get_payment_by_id = AsyncMock(return_value=sample_payment)

    with pytest.raises(ValueError, match="Cannot refund payment"):
        await service.refund_payment(sample_payment.id)


@pytest.mark.asyncio
async def test_refund_payment_not_found(mock_db_session):
    """Test refund fails when payment not found."""
    mock_gateway = AsyncMock(spec=PaymentGateway)
    service = PaymentService(mock_db_session, mock_gateway)
    service.get_payment_by_id = AsyncMock(return_value=None)

    with pytest.raises(ValueError, match="not found"):
        await service.refund_payment(uuid4())


@pytest.mark.asyncio
async def test_mark_completed(mock_db_session, sample_payment):
    """Test marking payment as completed."""
    mock_gateway = AsyncMock(spec=PaymentGateway)
    service = PaymentService(mock_db_session, mock_gateway)
    service.get_payment_by_id = AsyncMock(return_value=sample_payment)

    result = await service.mark_completed(sample_payment.id, "txn-123")

    assert result.status == PaymentStatus.COMPLETED
    assert result.payment_gateway_id == "txn-123"


@pytest.mark.asyncio
async def test_mark_failed(mock_db_session, sample_payment):
    """Test marking payment as failed."""
    mock_gateway = AsyncMock(spec=PaymentGateway)
    service = PaymentService(mock_db_session, mock_gateway)
    service.get_payment_by_id = AsyncMock(return_value=sample_payment)

    result = await service.mark_failed(
        sample_payment.id,
        error_code="processing_error",
        error_message="Gateway timeout",
    )

    assert result.status == PaymentStatus.FAILED
    assert result.error_code == "processing_error"
    assert result.error_message == "Gateway timeout"


def test_payment_model():
    """Test Payment model instantiation."""
    payment = Payment(
        order_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("99.99"),
        currency="USD",
        status=PaymentStatus.PENDING,
        payment_method="credit_card",
    )

    assert payment.amount == Decimal("99.99")
    assert payment.status == PaymentStatus.PENDING
    assert payment.currency == "USD"


def test_payment_status_enum():
    """Test PaymentStatus enum values."""
    assert PaymentStatus.PENDING == "pending"
    assert PaymentStatus.COMPLETED == "completed"
    assert PaymentStatus.FAILED == "failed"
    assert PaymentStatus.REFUNDED == "refunded"


def test_payment_repr(sample_payment):
    """Test Payment string representation."""
    repr_str = repr(sample_payment)
    assert "Payment" in repr_str
    assert str(sample_payment.order_id) in repr_str
