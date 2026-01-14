import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEventHandler } from './payment.handler';
import { OrderService } from '../services/order.service';
import { PaymentCompletedEvent, PaymentFailedEvent } from './dto/payment-events.dto';

describe('PaymentEventHandler', () => {
  let handler: PaymentEventHandler;
  let orderService: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEventHandler,
        {
          provide: OrderService,
          useValue: {
            handlePaymentCompleted: jest.fn(),
            handlePaymentFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<PaymentEventHandler>(PaymentEventHandler);
    orderService = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handlePaymentCompleted', () => {
    it('should process payment completed event', async () => {
      const event: PaymentCompletedEvent = {
        eventType: 'payment.completed',
        orderId: 'order-123',
        paymentId: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      await handler.handlePaymentCompleted(message);

      expect(orderService.handlePaymentCompleted).toHaveBeenCalledWith(
        'order-123',
        'payment-123',
      );
    });

    it('should throw error on invalid message', async () => {
      const message = {
        content: Buffer.from('invalid-json'),
      };

      await expect(handler.handlePaymentCompleted(message)).rejects.toThrow();
    });

    it('should propagate service errors', async () => {
      const event: PaymentCompletedEvent = {
        eventType: 'payment.completed',
        orderId: 'order-123',
        paymentId: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      orderService.handlePaymentCompleted.mockRejectedValue(
        new Error('Order not found'),
      );

      await expect(handler.handlePaymentCompleted(message)).rejects.toThrow(
        'Order not found',
      );
    });
  });

  describe('handlePaymentFailed', () => {
    it('should process payment failed event', async () => {
      const event: PaymentFailedEvent = {
        eventType: 'payment.failed',
        orderId: 'order-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'USD',
        reason: 'Insufficient funds',
        errorCode: 'INSUFFICIENT_FUNDS',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      await handler.handlePaymentFailed(message);

      expect(orderService.handlePaymentFailed).toHaveBeenCalledWith('order-123');
    });

    it('should handle payment failed without error code', async () => {
      const event: PaymentFailedEvent = {
        eventType: 'payment.failed',
        orderId: 'order-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'USD',
        reason: 'Payment declined',
        timestamp: new Date().toISOString(),
      };

      const message = {
        content: Buffer.from(JSON.stringify(event)),
      };

      await handler.handlePaymentFailed(message);

      expect(orderService.handlePaymentFailed).toHaveBeenCalledWith('order-123');
    });
  });
});
