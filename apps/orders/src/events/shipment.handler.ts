import { Injectable, Logger } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { ShipmentShippedEvent, ShipmentDeliveredEvent } from './dto/shipment-events.dto';

@Injectable()
export class ShipmentEventHandler {
  private readonly logger = new Logger(ShipmentEventHandler.name);

  constructor(private readonly orderService: OrderService) {}

  async handleShipmentShipped(message: any): Promise<void> {
    try {
      const event: ShipmentShippedEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing shipment.shipped event for order ${event.orderId}`);

      await this.orderService.handleShipmentShipped(event.orderId, event.trackingNumber);

      this.logger.log(`Successfully processed shipment.shipped for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to process shipment.shipped event: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  async handleShipmentDelivered(message: any): Promise<void> {
    try {
      const event: ShipmentDeliveredEvent = JSON.parse(message.content.toString());

      this.logger.log(`Processing shipment.delivered event for order ${event.orderId}`);

      await this.orderService.handleShipmentDelivered(event.orderId);

      this.logger.log(`Successfully processed shipment.delivered for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process shipment.delivered event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
