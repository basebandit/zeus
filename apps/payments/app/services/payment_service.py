"""
Payment business logic service.
Handles payment creation, processing, and state management.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus
from app.services.payment_gateway import PaymentGateway, PaymentResult


class PaymentService:
    """Service for managing payment operations."""

    def __init__(self, session: AsyncSession, gateway: PaymentGateway):
        """
        Initialize payment service.

        Args:
            session: Database session
            gateway: Payment gateway for processing payments
        """
        self.session = session
        self.gateway = gateway

    async def create_payment(
        self,
        order_id: UUID,
        user_id: UUID,
        amount: Decimal,
        currency: str,
        payment_method: str,
        metadata: Optional[dict] = None,
    ) -> Payment:
        """
        Create a new payment record in pending status.

        Args:
            order_id: Order ID this payment is for
            user_id: User making the payment
            amount: Payment amount
            currency: Currency code
            payment_method: Payment method
            metadata: Additional payment metadata

        Returns:
            Created payment record
        """
        payment = Payment(
            order_id=order_id,
            user_id=user_id,
            amount=amount,
            currency=currency,
            status=PaymentStatus.PENDING,
            payment_method=payment_method,
            payment_metadata=metadata,
        )

        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)

        return payment

    async def process_payment(self, payment: Payment) -> PaymentResult:
        """
        Process a payment through the payment gateway and update status.

        Args:
            payment: Payment record to process

        Returns:
            Payment result from gateway
        """
        # Call payment gateway
        result = await self.gateway.process_payment(
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            order_id=str(payment.order_id),
            user_id=str(payment.user_id),
            metadata=payment.payment_metadata,
        )

        # Update payment based on result
        if result.success:
            payment.status = PaymentStatus.COMPLETED
            payment.payment_gateway_id = result.gateway_transaction_id
        else:
            payment.status = PaymentStatus.FAILED
            payment.error_code = result.error_code
            payment.error_message = result.error_message

        await self.session.flush()
        await self.session.refresh(payment)

        return result

    async def get_payment_by_id(self, payment_id: UUID) -> Optional[Payment]:
        """
        Get payment by ID.

        Args:
            payment_id: Payment ID

        Returns:
            Payment record or None
        """
        result = await self.session.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    async def get_payment_by_order_id(self, order_id: UUID) -> Optional[Payment]:
        """
        Get payment by order ID.

        Args:
            order_id: Order ID

        Returns:
            Payment record or None
        """
        result = await self.session.execute(select(Payment).where(Payment.order_id == order_id))
        return result.scalar_one_or_none()

    async def mark_completed(
        self,
        payment_id: UUID,
        gateway_transaction_id: str,
    ) -> Payment:
        """
        Mark payment as completed.

        Args:
            payment_id: Payment ID
            gateway_transaction_id: Transaction ID from gateway

        Returns:
            Updated payment record
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        payment.status = PaymentStatus.COMPLETED
        payment.payment_gateway_id = gateway_transaction_id

        await self.session.flush()
        await self.session.refresh(payment)

        return payment

    async def mark_failed(
        self,
        payment_id: UUID,
        error_code: str,
        error_message: str,
    ) -> Payment:
        """
        Mark payment as failed.

        Args:
            payment_id: Payment ID
            error_code: Error code
            error_message: Error message

        Returns:
            Updated payment record
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        payment.status = PaymentStatus.FAILED
        payment.error_code = error_code
        payment.error_message = error_message

        await self.session.flush()
        await self.session.refresh(payment)

        return payment

    async def refund_payment(
        self,
        payment_id: UUID,
        reason: str = "customer_request",
    ) -> PaymentResult:
        """
        Refund a completed payment.

        Args:
            payment_id: Payment ID to refund
            reason: Reason for refund

        Returns:
            Refund result from gateway
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        if payment.status != PaymentStatus.COMPLETED:
            raise ValueError(f"Cannot refund payment with status {payment.status}")

        if not payment.payment_gateway_id:
            raise ValueError("Payment has no gateway transaction ID")

        # Process refund through gateway
        result = await self.gateway.refund_payment(
            gateway_transaction_id=payment.payment_gateway_id,
            amount=payment.amount,
            reason=reason,
        )

        # Update payment status
        if result.success:
            payment.status = PaymentStatus.REFUNDED

        await self.session.flush()
        await self.session.refresh(payment)

        return result
