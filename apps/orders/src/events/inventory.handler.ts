import { Injectable, Logger } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import {
  InventoryReservedEvent,
  InventoryReservationFailedEvent,
} from './dto/inventory-events.dto';

@Injectable()
export class InventoryEventHandler {
  private readonly logger = new Logger(InventoryEventHandler.name);

  constructor(private readonly orderService: OrderService) {}

  async handleInventoryReserved(message: any): Promise<void> {
    try {
      const event: InventoryReservedEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing inventory.reserved event for order ${event.orderId}`);

      // Update order to record inventory reservation
      // This can be extended to store reservationId in order_events
      this.logger.log(
        `Inventory reserved for order ${event.orderId} with reservation ${event.reservationId}`,
      );

      // The order will proceed with payment
      // Payment service should be listening to order.created events
    } catch (error) {
      this.logger.error(
        `Failed to process inventory.reserved event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleInventoryReservationFailed(message: any): Promise<void> {
    try {
      const event: InventoryReservationFailedEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing inventory.reservation_failed event for order ${event.orderId}`);

      // Cancel the order due to insufficient inventory
      await this.orderService.cancelOrder(event.orderId);

      this.logger.log(`Order ${event.orderId} cancelled due to inventory reservation failure`);
    } catch (error) {
      this.logger.error(
        `Failed to process inventory.reservation_failed event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
