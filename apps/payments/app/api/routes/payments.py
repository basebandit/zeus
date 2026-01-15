"""
Payment API endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_gateway import PaymentGateway
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


def get_payment_service(session: AsyncSession = Depends(get_db)) -> PaymentService:
    """Dependency to get payment service."""
    gateway = PaymentGateway()
    return PaymentService(session, gateway)


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Create a new payment (manual creation for testing).

    In production, payments are created automatically via inventory.reserved events.
    This endpoint is primarily for testing and manual payment creation.
    """
    payment = await service.create_payment(
        order_id=payment_data.order_id,
        user_id=payment_data.user_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_method=payment_data.payment_method,
        metadata=payment_data.metadata,
    )

    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment by ID."""
    payment = await service.get_payment_by_id(payment_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment {payment_id} not found",
        )

    return payment


@router.get("/order/{order_id}", response_model=PaymentResponse)
async def get_payment_by_order(
    order_id: UUID,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment by order ID."""
    payment = await service.get_payment_by_order_id(order_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment for order {order_id} not found",
        )

    return payment


@router.post("/{payment_id}/process", response_model=PaymentResponse)
async def process_payment(
    payment_id: UUID,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Process a pending payment (manual processing for testing).

    In production, payments are processed automatically via event handlers.
    """
    payment = await service.get_payment_by_id(payment_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment {payment_id} not found",
        )

    result = await service.process_payment(payment)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment failed: {result.error_message}",
        )

    return payment
