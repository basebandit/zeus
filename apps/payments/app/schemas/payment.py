from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.payment import PaymentStatus


class PaymentBase(BaseModel):
    order_id: UUID
    user_id: UUID
    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    payment_method: str = Field(max_length=50)
    metadata: Optional[dict] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    payment_gateway_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[dict] = None


class PaymentResponse(PaymentBase):
    id: UUID
    status: PaymentStatus
    payment_gateway_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
