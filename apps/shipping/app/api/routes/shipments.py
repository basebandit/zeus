"""
Shipment API routes.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.events.rabbitmq import rabbitmq_service
from app.events.schemas import ShipmentDeliveredEvent
from app.models.shipment import ShipmentStatus
from app.schemas.shipment import ShipmentResponse
from app.services.shipping_service import ShippingService

router = APIRouter(prefix="/api/v1/shipments", tags=["shipments"])


@router.get("/order/{order_id}", response_model=ShipmentResponse)
async def get_shipment_by_order(order_id: UUID, db: AsyncSession = Depends(get_db)):
    shipment = await ShippingService(db).get_by_order(order_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="shipment not found")
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(shipment_id: UUID, db: AsyncSession = Depends(get_db)):
    shipment = await ShippingService(db).get_by_id(shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="shipment not found")
    return shipment


@router.post("/{shipment_id}/deliver", response_model=ShipmentResponse)
async def deliver_shipment(shipment_id: UUID, db: AsyncSession = Depends(get_db)):
    """Simulate delivery confirmation and publish shipment.delivered."""
    service = ShippingService(db)
    shipment = await service.get_by_id(shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="shipment not found")
    if shipment.status != ShipmentStatus.SHIPPED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"shipment must be 'shipped' to deliver, is '{shipment.status}'",
        )

    await service.mark_delivered(shipment)
    await db.commit()
    # The UPDATE expires the server-side `updated_at` (onupdate=now()); refresh
    # reloads it in the async context before the response is serialized.
    await db.refresh(shipment)

    await rabbitmq_service.publish_shipment_delivered(
        ShipmentDeliveredEvent(
            shipmentId=shipment.id,
            orderId=shipment.order_id,
            userId=shipment.user_id,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return shipment
