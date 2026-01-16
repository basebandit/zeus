"""
Pytest configuration and fixtures.

Uses mocking for database operations to test business logic in isolation.
"""

import asyncio
from decimal import Decimal
from typing import Generator
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.payment import Payment, PaymentStatus


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def sample_payment_data():
    """Sample payment data for testing."""
    return {
        "order_id": uuid4(),
        "user_id": uuid4(),
        "amount": Decimal("99.99"),
        "currency": "USD",
        "payment_method": "credit_card",
        "status": PaymentStatus.PENDING,
    }


@pytest.fixture
def sample_payment(sample_payment_data):
    """Create a sample Payment object."""
    return Payment(
        id=uuid4(),
        order_id=sample_payment_data["order_id"],
        user_id=sample_payment_data["user_id"],
        amount=sample_payment_data["amount"],
        currency=sample_payment_data["currency"],
        payment_method=sample_payment_data["payment_method"],
        status=sample_payment_data["status"],
    )
