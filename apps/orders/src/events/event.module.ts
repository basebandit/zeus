import { Module, OnModuleInit } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { PaymentEventHandler } from './payment.handler';
import { InventoryEventHandler } from './inventory.handler';
import { ShipmentEventHandler } from './shipment.handler';
import { OrderModule } from '../modules/order.module';

@Module({
  imports: [OrderModule],
  providers: [EventService, PaymentEventHandler, InventoryEventHandler, ShipmentEventHandler],
  exports: [EventService],
})
export class EventModule implements OnModuleInit {
  constructor(
    private readonly eventService: EventService,
    private readonly paymentHandler: PaymentEventHandler,
    private readonly inventoryHandler: InventoryEventHandler,
    private readonly shipmentHandler: ShipmentEventHandler,
  ) {}

  async onModuleInit() {
    // Set up event consumers when the module initializes
    await this.eventService.consumePaymentEvents(
      this.paymentHandler.handlePaymentCompleted.bind(this.paymentHandler),
      this.paymentHandler.handlePaymentFailed.bind(this.paymentHandler),
    );

    await this.eventService.consumeInventoryEvents(
      this.inventoryHandler.handleInventoryReserved.bind(this.inventoryHandler),
      this.inventoryHandler.handleInventoryReservationFailed.bind(this.inventoryHandler),
    );

    await this.eventService.consumeShipmentEvents(
      this.shipmentHandler.handleShipmentShipped.bind(this.shipmentHandler),
      this.shipmentHandler.handleShipmentDelivered.bind(this.shipmentHandler),
    );
  }
}
