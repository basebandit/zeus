from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import uuid4

from sqlalchemy import (
    Column,
    String,
    Numeric,
    DateTime,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(String(20), nullable=False, default=PaymentStatus.PENDING, index=True)
    payment_method = Column(String(50), nullable=False)
    payment_gateway_id = Column(String(255), nullable=True)
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    payment_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Payment(id={self.id}, order_id={self.order_id}, status={self.status}, amount={self.amount})>"
