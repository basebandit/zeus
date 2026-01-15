"""
Mock Payment Gateway simulating Stripe-like payment processing.
Configurable success rate for testing different scenarios.
"""

import asyncio
import random
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from app.config import settings


@dataclass
class PaymentResult:
    """Result of a payment processing attempt."""

    success: bool
    gateway_transaction_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class PaymentGateway:
    """
    Mock payment gateway simulating real payment processor behavior.

    Simulates:
    - Random payment success/failure based on configured success rate
    - Network latency (100-500ms)
    - Various error scenarios (insufficient funds, card declined, etc.)
    """

    def __init__(self, success_rate: float = None):
        """
        Initialize payment gateway.

        Args:
            success_rate: Probability of successful payment (0.0-1.0).
                         Defaults to PAYMENT_GATEWAY_SUCCESS_RATE from settings.
        """
        self.success_rate = success_rate if success_rate is not None else settings.payment_gateway_success_rate

    async def process_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method: str,
        order_id: str,
        user_id: str,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        """
        Process a payment transaction.

        Args:
            amount: Payment amount
            currency: Currency code (e.g., USD)
            payment_method: Payment method (credit_card, debit_card, paypal, etc.)
            order_id: Order ID this payment is for
            user_id: User making the payment
            metadata: Additional payment metadata

        Returns:
            PaymentResult with success status and transaction details
        """
        # Simulate network latency
        await asyncio.sleep(random.uniform(0.1, 0.5))

        # Determine if payment should succeed
        if random.random() <= self.success_rate:
            return PaymentResult(
                success=True,
                gateway_transaction_id=f"txn_{uuid4().hex[:16]}",
            )
        else:
            # Simulate various failure scenarios
            return self._generate_failure()

    def _generate_failure(self) -> PaymentResult:
        """Generate a random payment failure scenario."""
        failures = [
            ("insufficient_funds", "Insufficient funds in account"),
            ("card_declined", "Card was declined by the issuing bank"),
            ("expired_card", "Card has expired"),
            ("invalid_cvv", "Invalid CVV code provided"),
            ("fraud_detected", "Transaction flagged as potentially fraudulent"),
            ("processing_error", "Payment processor encountered an error"),
            ("limit_exceeded", "Transaction amount exceeds daily limit"),
        ]

        error_code, error_message = random.choice(failures)

        return PaymentResult(
            success=False,
            error_code=error_code,
            error_message=error_message,
        )

    async def refund_payment(
        self,
        gateway_transaction_id: str,
        amount: Decimal,
        reason: str = "customer_request",
    ) -> PaymentResult:
        """
        Refund a previously successful payment.

        Args:
            gateway_transaction_id: Original transaction ID to refund
            amount: Amount to refund
            reason: Reason for refund

        Returns:
            PaymentResult with refund status
        """
        # Simulate network latency
        await asyncio.sleep(random.uniform(0.1, 0.3))

        # Refunds succeed 99% of the time in this mock
        if random.random() <= 0.99:
            return PaymentResult(
                success=True,
                gateway_transaction_id=f"ref_{uuid4().hex[:16]}",
            )
        else:
            return PaymentResult(
                success=False,
                error_code="refund_failed",
                error_message="Failed to process refund",
            )
