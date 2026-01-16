"""
Event handlers for processing consumed events.
"""

import logging
from datetime import datetime

from app.db.session import AsyncSessionLocal
from app.events.rabbitmq import rabbitmq_service
from app.events.schemas import (
    InventoryReservedEvent,
    PaymentCompletedEvent,
    PaymentFailedEvent,
)
from app.services.payment_gateway import PaymentGateway
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)


async def handle_inventory_reserved(event_data: dict):
    """
    Handle inventory.reserved event.

    Process flow:
    1. Create payment record in pending status
    2. Process payment through gateway
    3. Publish payment.completed or payment.failed event

    Args:
        event_data: Event data dictionary
    """
    try:
        # Parse event
        event = InventoryReservedEvent(**event_data)
        logger.info(f"Processing inventory.reserved event for order {event.order_id}")

        # Create services with database session
        async with AsyncSessionLocal() as session:
            gateway = PaymentGateway()
            payment_service = PaymentService(session, gateway)

            try:
                # Create payment record
                payment = await payment_service.create_payment(
                    order_id=event.order_id,
                    user_id=event.user_id,
                    amount=event.total_amount,
                    currency=event.currency,
                    payment_method=event.payment_method,
                    metadata={
                        "reservation_id": str(event.reservation_id),
                        "items": [item.model_dump(mode="json") for item in event.items],
                    },
                )

                logger.info(f"Created payment {payment.id} for order {event.order_id}")

                # Process payment through gateway
                result = await payment_service.process_payment(payment)

                # Commit transaction
                await session.commit()

                # Publish event based on result
                if result.success:
                    logger.info(
                        f"Payment {payment.id} completed successfully for order {event.order_id}"
                    )

                    # Publish payment.completed event
                    completed_event = PaymentCompletedEvent(
                        order_id=payment.order_id,
                        payment_id=payment.id,
                        user_id=payment.user_id,
                        amount=payment.amount,
                        currency=payment.currency,
                        payment_method=payment.payment_method,
                        payment_gateway_id=payment.payment_gateway_id,
                        timestamp=datetime.utcnow(),
                    )

                    await rabbitmq_service.publish_payment_completed(completed_event)
                    logger.info(
                        f"Published payment.completed event for order {event.order_id}"
                    )

                else:
                    logger.warning(
                        f"Payment {payment.id} failed for order {event.order_id}: "
                        f"{result.error_code} - {result.error_message}"
                    )

                    # Publish payment.failed event
                    failed_event = PaymentFailedEvent(
                        order_id=payment.order_id,
                        user_id=payment.user_id,
                        amount=payment.amount,
                        currency=payment.currency,
                        reason=result.error_message or "Payment processing failed",
                        error_code=result.error_code,
                        timestamp=datetime.utcnow(),
                    )

                    await rabbitmq_service.publish_payment_failed(failed_event)
                    logger.info(
                        f"Published payment.failed event for order {event.order_id}"
                    )

            except Exception as e:
                await session.rollback()
                logger.error(
                    f"Error processing payment for order {event.order_id}: {e}"
                )
                raise

    except Exception as e:
        logger.error(f"Error handling inventory.reserved event: {e}", exc_info=True)
        raise
