import { Injectable, Logger } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { PaymentCompletedEvent, PaymentFailedEvent } from './dto/payment-events.dto';

@Injectable()
export class PaymentEventHandler {
  private readonly logger = new Logger(PaymentEventHandler.name);

  constructor(private readonly orderService: OrderService) {}

  async handlePaymentCompleted(message: any): Promise<void> {
    try {
      const event: PaymentCompletedEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing payment.completed event for order ${event.orderId}`);

      await this.orderService.handlePaymentCompleted(
        event.orderId,
        event.paymentId,
      );

      this.logger.log(`Successfully processed payment.completed for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process payment.completed event: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  async handlePaymentFailed(message: any): Promise<void> {
    try {
      const event: PaymentFailedEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing payment.failed event for order ${event.orderId}`);

      await this.orderService.handlePaymentFailed(event.orderId);

      this.logger.log(`Successfully processed payment.failed for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process payment.failed event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
