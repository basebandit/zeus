from datetime import datetime, timezone
from uuid import uuid4

from app.events.schemas import OrderConfirmedEvent, ShipmentShippedEvent


def test_order_confirmed_parses_camelcase_aliases():
    order_id = uuid4()
    user_id = uuid4()
    event = OrderConfirmedEvent(
        **{
            "eventType": "order.confirmed",
            "orderId": str(order_id),
            "userId": str(user_id),
            "paymentId": str(uuid4()),
            "shippingAddress": {"city": "Nairobi", "country": "KE"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    assert event.order_id == order_id
    assert event.user_id == user_id
    assert event.shipping_address == {"city": "Nairobi", "country": "KE"}


def test_order_confirmed_allows_missing_address():
    event = OrderConfirmedEvent(
        **{
            "eventType": "order.confirmed",
            "orderId": str(uuid4()),
            "userId": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    assert event.shipping_address is None


def test_shipment_shipped_dumps_camelcase():
    event = ShipmentShippedEvent(
        shipmentId=uuid4(),
        orderId=uuid4(),
        userId=uuid4(),
        trackingNumber="ZX0123456789AB",
        carrier="ZeusExpress",
    )
    dumped = event.model_dump(by_alias=True, mode="json")
    assert dumped["eventType"] == "shipment.shipped"
    assert dumped["trackingNumber"] == "ZX0123456789AB"
