from uuid import uuid4

import pytest

from app.models.shipment import Shipment, ShipmentStatus
from app.services.shipping_service import ShippingService, generate_tracking_number
from tests.conftest import make_session


def test_generate_tracking_number_format():
    tn = generate_tracking_number()
    assert tn.startswith("ZX")
    assert len(tn) == 14
    assert tn[2:].isalnum()


@pytest.mark.asyncio
async def test_create_shipment_when_none_exists():
    session = make_session(existing=None)
    service = ShippingService(session)
    order_id, user_id = uuid4(), uuid4()

    shipment = await service.create_shipment(
        order_id=order_id, user_id=user_id, address={"city": "Nairobi"}
    )

    assert shipment.order_id == order_id
    assert shipment.user_id == user_id
    assert shipment.status == ShipmentStatus.PENDING
    assert shipment.carrier == "ZeusExpress"
    assert shipment.address == {"city": "Nairobi"}
    session.add.assert_called_once()
    session.flush.assert_awaited()


@pytest.mark.asyncio
async def test_create_shipment_is_idempotent():
    existing = Shipment(order_id=uuid4(), user_id=uuid4(), status=ShipmentStatus.PENDING)
    session = make_session(existing=existing)
    service = ShippingService(session)

    result = await service.create_shipment(
        order_id=existing.order_id, user_id=existing.user_id, address=None
    )

    assert result is existing
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_mark_shipped_assigns_tracking():
    session = make_session()
    service = ShippingService(session)
    shipment = Shipment(order_id=uuid4(), user_id=uuid4(), status=ShipmentStatus.PENDING)

    await service.mark_shipped(shipment)

    assert shipment.status == ShipmentStatus.SHIPPED
    assert shipment.tracking_number is not None
    assert shipment.tracking_number.startswith("ZX")


@pytest.mark.asyncio
async def test_cancel_pending_shipment():
    existing = Shipment(order_id=uuid4(), user_id=uuid4(), status=ShipmentStatus.PENDING)
    session = make_session(existing=existing)
    service = ShippingService(session)

    result = await service.cancel_by_order(existing.order_id)

    assert result.status == ShipmentStatus.CANCELLED


@pytest.mark.asyncio
async def test_cannot_cancel_shipped_shipment():
    existing = Shipment(order_id=uuid4(), user_id=uuid4(), status=ShipmentStatus.SHIPPED)
    session = make_session(existing=existing)
    service = ShippingService(session)

    result = await service.cancel_by_order(existing.order_id)

    assert result.status == ShipmentStatus.SHIPPED  # unchanged
