"""
Unit tests for Payment Service.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus
from app.services.payment_gateway import PaymentGateway, PaymentResult
from app.services.payment_service import PaymentService


@pytest.mark.asyncio
async def test_create_payment(test_db_session: AsyncSession, sample_payment_data):
    """Test creating a new payment."""
    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    payment = await service.create_payment(
        order_id=sample_payment_data["order_id"],
        user_id=sample_payment_data["user_id"],
        amount=Decimal(str(sample_payment_data["amount"])),
        currency=sample_payment_data["currency"],
        payment_method=sample_payment_data["payment_method"],
    )

    assert payment.id is not None
    assert payment.order_id == sample_payment_data["order_id"]
    assert payment.user_id == sample_payment_data["user_id"]
    assert payment.amount == Decimal(str(sample_payment_data["amount"]))
    assert payment.status == PaymentStatus.PENDING
    assert payment.currency == "USD"


@pytest.mark.asyncio
async def test_get_payment_by_order_id(test_db_session: AsyncSession):
    """Test retrieving payment by order ID."""
    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    order_id = uuid4()
    payment = await service.create_payment(
        order_id=order_id,
        user_id=uuid4(),
        amount=Decimal("50.00"),
        currency="USD",
        payment_method="credit_card",
    )

    retrieved = await service.get_payment_by_order_id(order_id)

    assert retrieved is not None
    assert retrieved.id == payment.id
    assert retrieved.order_id == order_id


@pytest.mark.asyncio
async def test_process_payment_success(test_db_session: AsyncSession, monkeypatch):
    """Test successful payment processing."""
    # Mock gateway to always succeed
    async def mock_process(*args, **kwargs):
        return PaymentResult(
            success=True,
            transaction_id="test-txn-123",
            error_code=None,
            error_message=None,
        )

    monkeypatch.setattr(PaymentGateway, "process_payment", mock_process)

    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    payment = await service.create_payment(
        order_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
    )

    result = await service.process_payment(payment)

    assert result.success is True
    assert payment.status == PaymentStatus.COMPLETED
    assert payment.payment_gateway_id == "test-txn-123"


@pytest.mark.asyncio
async def test_process_payment_failure(test_db_session: AsyncSession, monkeypatch):
    """Test failed payment processing."""
    # Mock gateway to always fail
    async def mock_process(*args, **kwargs):
        return PaymentResult(
            success=False,
            transaction_id=None,
            error_code="INSUFFICIENT_FUNDS",
            error_message="Insufficient funds in account",
        )

    monkeypatch.setattr(PaymentGateway, "process_payment", mock_process)

    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    payment = await service.create_payment(
        order_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("1000.00"),
        currency="USD",
        payment_method="credit_card",
    )

    result = await service.process_payment(payment)

    assert result.success is False
    assert payment.status == PaymentStatus.FAILED
    assert payment.error_code == "INSUFFICIENT_FUNDS"
    assert "Insufficient funds" in payment.error_message


@pytest.mark.asyncio
async def test_payment_idempotency(test_db_session: AsyncSession):
    """Test that creating payment for same order fails."""
    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    order_id = uuid4()

    # Create first payment
    await service.create_payment(
        order_id=order_id,
        user_id=uuid4(),
        amount=Decimal("50.00"),
        currency="USD",
        payment_method="credit_card",
    )

    await test_db_session.commit()

    # Attempt to create second payment for same order should fail
    with pytest.raises(Exception):  # Will raise integrity error
        await service.create_payment(
            order_id=order_id,
            user_id=uuid4(),
            amount=Decimal("50.00"),
            currency="USD",
            payment_method="credit_card",
        )
        await test_db_session.commit()


@pytest.mark.asyncio
async def test_payment_amount_validation(test_db_session: AsyncSession):
    """Test payment amount validation."""
    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    # Negative amount should fail
    with pytest.raises(ValueError):
        await service.create_payment(
            order_id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("-10.00"),
            currency="USD",
            payment_method="credit_card",
        )

    # Zero amount should fail
    with pytest.raises(ValueError):
        await service.create_payment(
            order_id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("0.00"),
            currency="USD",
            payment_method="credit_card",
        )


@pytest.mark.asyncio
async def test_payment_status_transitions(test_db_session: AsyncSession):
    """Test payment status transitions."""
    gateway = PaymentGateway()
    service = PaymentService(test_db_session, gateway)

    payment = await service.create_payment(
        order_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("50.00"),
        currency="USD",
        payment_method="credit_card",
    )

    assert payment.status == PaymentStatus.PENDING

    # Simulate completion
    payment.status = PaymentStatus.COMPLETED
    payment.payment_gateway_id = "test-txn-456"
    await test_db_session.commit()

    retrieved = await service.get_payment(payment.id)
    assert retrieved.status == PaymentStatus.COMPLETED


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
