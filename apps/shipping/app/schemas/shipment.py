from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    user_id: UUID
    status: str
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    address: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
