import { Test, TestingModule } from '@nestjs/testing';
import { InventoryEventHandler } from './inventory.handler';
import { OrderService } from '../services/order.service';
import {
  InventoryReservedEvent,
  InventoryReservationFailedEvent,
} from './dto/inventory-events.dto';

describe('InventoryEventHandler', () => {
  let handler: InventoryEventHandler;
  let orderService: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryEventHandler,
        {
          provide: OrderService,
          useValue: {
            cancelOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<InventoryEventHandler>(InventoryEventHandler);
    orderService = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handleInventoryReserved', () => {
    it('should process inventory reserved event', async () => {
      const event: InventoryReservedEvent = {
        eventType: 'inventory.reserved',
        orderId: 'order-123',
        reservationId: 'reservation-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      await handler.handleInventoryReserved(message);

      // Just verify it doesn't throw - this event is mainly for logging
      expect(true).toBe(true);
    });

    it('should throw error on invalid message', async () => {
      const message = {
        content: Buffer.from('invalid-json'),
      };

      await expect(handler.handleInventoryReserved(message)).rejects.toThrow();
    });
  });

  describe('handleInventoryReservationFailed', () => {
    it('should cancel order when inventory reservation fails', async () => {
      const event: InventoryReservationFailedEvent = {
        eventType: 'inventory.reservation_failed',
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            available: 1,
          },
        ],
        reason: 'Insufficient inventory',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      await handler.handleInventoryReservationFailed(message);

      expect(orderService.cancelOrder).toHaveBeenCalledWith('order-123');
    });

    it('should propagate service errors', async () => {
      const event: InventoryReservationFailedEvent = {
        eventType: 'inventory.reservation_failed',
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            available: 0,
          },
        ],
        reason: 'Product out of stock',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      orderService.cancelOrder.mockRejectedValue(new Error('Order not found'));

      await expect(
        handler.handleInventoryReservationFailed(message),
      ).rejects.toThrow('Order not found');
    });
  });
});
