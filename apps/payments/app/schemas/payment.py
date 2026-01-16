from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

# Status type matching PaymentStatus constants
PaymentStatusType = Literal["pending", "completed", "failed", "refunded"]


class PaymentBase(BaseModel):
    order_id: UUID
    user_id: UUID
    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    payment_method: str = Field(max_length=50)
    payment_metadata: Optional[dict] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatusType] = None
    payment_gateway_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    payment_metadata: Optional[dict] = None


class PaymentResponse(PaymentBase):
    id: UUID
    status: PaymentStatusType
    payment_gateway_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
