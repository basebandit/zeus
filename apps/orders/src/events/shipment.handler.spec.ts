import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ShipmentEventHandler } from './shipment.handler';
import { OrderService } from '../services/order.service';
import { ShipmentShippedEvent, ShipmentDeliveredEvent } from './dto/shipment-events.dto';

describe('ShipmentEventHandler', () => {
  let handler: ShipmentEventHandler;
  let orderService: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentEventHandler,
        {
          provide: OrderService,
          useValue: {
            handleShipmentShipped: jest.fn(),
            handleShipmentDelivered: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    handler = module.get<ShipmentEventHandler>(ShipmentEventHandler);
    orderService = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handleShipmentShipped', () => {
    it('should advance the order with the tracking number', async () => {
      const event: ShipmentShippedEvent = {
        eventType: 'shipment.shipped',
        shipmentId: 'shipment-123',
        orderId: 'order-123',
        userId: 'user-123',
        trackingNumber: 'ZX0123456789AB',
        carrier: 'ZeusExpress',
        timestamp: new Date().toISOString(),
      };

      const message = { content: Buffer.from(JSON.stringify(event)) };

      await handler.handleShipmentShipped(message);

      expect(orderService.handleShipmentShipped).toHaveBeenCalledWith(
        'order-123',
        'ZX0123456789AB',
      );
    });

    it('should throw error on invalid message', async () => {
      const message = { content: Buffer.from('invalid-json') };
      await expect(handler.handleShipmentShipped(message)).rejects.toThrow();
    });

    it('should propagate service errors', async () => {
      const event: ShipmentShippedEvent = {
        eventType: 'shipment.shipped',
        shipmentId: 'shipment-123',
        orderId: 'order-123',
        userId: 'user-123',
        trackingNumber: 'ZX0123456789AB',
        timestamp: new Date().toISOString(),
      };

      const message = { content: Buffer.from(JSON.stringify(event)) };
      orderService.handleShipmentShipped.mockRejectedValue(new Error('Order not found'));

      await expect(handler.handleShipmentShipped(message)).rejects.toThrow('Order not found');
    });
  });

  describe('handleShipmentDelivered', () => {
    it('should mark the order delivered', async () => {
      const event: ShipmentDeliveredEvent = {
        eventType: 'shipment.delivered',
        shipmentId: 'shipment-123',
        orderId: 'order-123',
        userId: 'user-123',
        timestamp: new Date().toISOString(),
      };

      const message = { content: Buffer.from(JSON.stringify(event)) };

      await handler.handleShipmentDelivered(message);

      expect(orderService.handleShipmentDelivered).toHaveBeenCalledWith('order-123');
    });
  });
});
