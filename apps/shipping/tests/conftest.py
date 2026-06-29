"""
Pytest fixtures. Database access is mocked so business logic is tested in isolation.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest


def make_session(existing=None):
    """Build a mock AsyncSession whose get_by_order query returns `existing`."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=existing)
    session.execute = AsyncMock(return_value=result)
    session.get = AsyncMock(return_value=existing)
    return session


@pytest.fixture
def mock_session():
    return make_session()
