"""
Shipment business logic.
"""

import logging
import uuid
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.shipment import Shipment, ShipmentStatus

logger = logging.getLogger(__name__)


def generate_tracking_number() -> str:
    """Generate a pseudo carrier tracking number."""
    return f"ZX{uuid.uuid4().hex[:12].upper()}"


class ShippingService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_order(self, order_id: UUID) -> Optional[Shipment]:
        result = await self.session.execute(
            select(Shipment).where(Shipment.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, shipment_id: UUID) -> Optional[Shipment]:
        return await self.session.get(Shipment, shipment_id)

    async def create_shipment(
        self,
        order_id: UUID,
        user_id: UUID,
        address: Optional[dict[str, Any]],
    ) -> Shipment:
        """Create a pending shipment. Idempotent on order_id."""
        existing = await self.get_by_order(order_id)
        if existing is not None:
            logger.info(f"Shipment already exists for order {order_id}")
            return existing

        shipment = Shipment(
            order_id=order_id,
            user_id=user_id,
            status=ShipmentStatus.PENDING,
            carrier=settings.carrier,
            address=address,
        )
        self.session.add(shipment)
        await self.session.flush()
        return shipment

    async def mark_shipped(self, shipment: Shipment) -> Shipment:
        """Simulate packing then dispatch: assign a tracking number and ship."""
        shipment.status = ShipmentStatus.SHIPPED
        shipment.tracking_number = generate_tracking_number()
        await self.session.flush()
        return shipment

    async def mark_delivered(self, shipment: Shipment) -> Shipment:
        shipment.status = ShipmentStatus.DELIVERED
        await self.session.flush()
        return shipment

    async def cancel_by_order(self, order_id: UUID) -> Optional[Shipment]:
        """Cancel a shipment unless it has already shipped/delivered."""
        shipment = await self.get_by_order(order_id)
        if shipment is None:
            return None
        if shipment.status in (ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED):
            logger.warning(
                f"Cannot cancel shipment {shipment.id}: already {shipment.status}"
            )
            return shipment
        shipment.status = ShipmentStatus.CANCELLED
        await self.session.flush()
        return shipment
