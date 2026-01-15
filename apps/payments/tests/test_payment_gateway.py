"""
Unit tests for Payment Gateway (mock Stripe).
"""

from decimal import Decimal

import pytest

from app.services.payment_gateway import PaymentGateway


@pytest.mark.asyncio
async def test_payment_gateway_success():
    """Test successful payment processing."""
    gateway = PaymentGateway(success_rate=1.0)  # Always succeed

    result = await gateway.process_payment(
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
        metadata={"order_id": "test-order-123"},
    )

    assert result.success is True
    assert result.transaction_id is not None
    assert result.error_code is None
    assert result.error_message is None


@pytest.mark.asyncio
async def test_payment_gateway_failure():
    """Test failed payment processing."""
    gateway = PaymentGateway(success_rate=0.0)  # Always fail

    result = await gateway.process_payment(
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
        metadata={"order_id": "test-order-123"},
    )

    assert result.success is False
    assert result.transaction_id is None
    assert result.error_code is not None
    assert result.error_message is not None


@pytest.mark.asyncio
async def test_payment_gateway_different_methods():
    """Test processing payments with different payment methods."""
    gateway = PaymentGateway(success_rate=1.0)

    methods = ["credit_card", "debit_card", "paypal"]

    for method in methods:
        result = await gateway.process_payment(
            amount=Decimal("50.00"),
            currency="USD",
            payment_method=method,
            metadata={},
        )
        assert result.success is True


@pytest.mark.asyncio
async def test_payment_gateway_currencies():
    """Test processing payments in different currencies."""
    gateway = PaymentGateway(success_rate=1.0)

    currencies = ["USD", "EUR", "GBP"]

    for currency in currencies:
        result = await gateway.process_payment(
            amount=Decimal("100.00"),
            currency=currency,
            payment_method="credit_card",
            metadata={},
        )
        assert result.success is True


@pytest.mark.asyncio
async def test_payment_gateway_processing_delay():
    """Test that payment processing has realistic delay."""
    import time

    gateway = PaymentGateway(success_rate=1.0)

    start = time.time()
    await gateway.process_payment(
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
        metadata={},
    )
    duration = time.time() - start

    # Should take between 0.1 and 0.5 seconds (simulated delay)
    assert duration >= 0.1
    assert duration <= 1.0


@pytest.mark.asyncio
async def test_refund_payment():
    """Test payment refund functionality."""
    gateway = PaymentGateway(success_rate=1.0)

    # Process payment first
    payment_result = await gateway.process_payment(
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
        metadata={},
    )

    # Refund the payment
    refund_result = await gateway.refund_payment(
        transaction_id=payment_result.transaction_id,
        amount=Decimal("100.00"),
    )

    assert refund_result.success is True
    assert refund_result.transaction_id is not None


@pytest.mark.asyncio
async def test_partial_refund():
    """Test partial payment refund."""
    gateway = PaymentGateway(success_rate=1.0)

    # Process payment
    payment_result = await gateway.process_payment(
        amount=Decimal("100.00"),
        currency="USD",
        payment_method="credit_card",
        metadata={},
    )

    # Partial refund
    refund_result = await gateway.refund_payment(
        transaction_id=payment_result.transaction_id,
        amount=Decimal("50.00"),
    )

    assert refund_result.success is True
