import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { EventService } from './event.service';
import { RedisService } from './redis.service';
import { Order, OrderItem, OrderEvent, OrderStatus } from '../entities/order.entity';
import { AddToCartDto, CreateOrderDto } from '../dto/order.dto';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderEventRepository: jest.Mocked<Repository<OrderEvent>>;
  let eventService: jest.Mocked<EventService>;
  let redisService: jest.Mocked<RedisService>;

  const mockOrder: Order = {
    id: 'order-123',
    userId: 'user-123',
    totalAmount: 99.99,
    currency: 'USD',
    status: OrderStatus.CART,
    paymentId: null,
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US',
    },
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn((data) => data),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderEvent),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            publishOrderCreated: jest.fn(),
            publishOrderConfirmed: jest.fn(),
            publishOrderCancelled: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getCart: jest.fn(),
            setCart: jest.fn(),
            deleteCart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderEventRepository = module.get(getRepositoryToken(OrderEvent));
    eventService = module.get(EventService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToCart', () => {
    const addToCartDto: AddToCartDto = {
      userId: 'user-123',
      productId: 'product-123',
      quantity: 2,
    };

    it('should create a new cart if none exists', async () => {
      redisService.getCart.mockResolvedValue(null);
      orderRepository.findOne.mockResolvedValue(null);
      orderRepository.create.mockReturnValue({
        ...mockOrder,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
      } as Order);
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 59.98,
      } as Order);

      const result = await service.addToCart(addToCartDto);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.totalAmount).toBe(59.98);
      expect(redisService.setCart).toHaveBeenCalledWith('user-123', result);
    });

    it('should add item to existing cart', async () => {
      const existingCart = {
        ...mockOrder,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-456',
            quantity: 1,
            unitPrice: 19.99,
            totalPrice: 19.99,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 19.99,
      };

      redisService.getCart.mockResolvedValue(existingCart as Order);
      orderRepository.save.mockResolvedValue({
        ...existingCart,
        items: [
          ...existingCart.items,
          {
            id: 'item-124',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 79.97,
      } as Order);

      const result = await service.addToCart(addToCartDto);

      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(79.97);
    });

    it('should increment quantity if product already in cart', async () => {
      const existingCart = {
        ...mockOrder,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 1,
            unitPrice: 29.99,
            totalPrice: 29.99,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 29.99,
      };

      redisService.getCart.mockResolvedValue(existingCart as Order);
      orderRepository.save.mockResolvedValue({
        ...existingCart,
        items: [
          {
            ...existingCart.items[0],
            quantity: 3,
            totalPrice: 89.97,
          },
        ],
        totalAmount: 89.97,
      } as Order);

      const result = await service.addToCart(addToCartDto);

      expect(result.items[0].quantity).toBe(3);
      expect(result.totalAmount).toBe(89.97);
    });
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      userId: 'user-123',
      items: [
        {
          productId: 'product-123',
          quantity: 2,
        },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'US',
      },
    };

    it('should create order and publish event', async () => {
      const createdOrder = {
        ...mockOrder,
        status: OrderStatus.PENDING,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 59.98,
      };

      orderRepository.create.mockReturnValue(createdOrder as Order);
      orderRepository.save.mockResolvedValue(createdOrder as Order);
      orderEventRepository.save.mockResolvedValue({} as OrderEvent);

      const result = await service.createOrder(createOrderDto);

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(eventService.publishOrderCreated).toHaveBeenCalledWith(result);
      expect(redisService.deleteCart).toHaveBeenCalledWith('user-123');
    });
  });

  describe('handlePaymentCompleted', () => {
    it('should update order status to confirmed', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: OrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(pendingOrder as Order);
      orderRepository.save.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CONFIRMED,
        paymentId: 'payment-123',
      } as Order);
      orderEventRepository.save.mockResolvedValue({} as OrderEvent);

      await service.handlePaymentCompleted('order-123', 'payment-123');

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          paymentId: 'payment-123',
        }),
      );
      expect(eventService.publishOrderConfirmed).toHaveBeenCalled();
    });

    it('should throw error if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.handlePaymentCompleted('order-123', 'payment-123')).rejects.toThrow(
        'Order not found',
      );
    });
  });

  describe('handlePaymentFailed', () => {
    it('should cancel order', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: OrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(pendingOrder as Order);
      orderRepository.save.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CANCELLED,
      } as Order);
      orderEventRepository.save.mockResolvedValue({} as OrderEvent);

      await service.handlePaymentFailed('order-123');

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CANCELLED,
        }),
      );
      expect(eventService.publishOrderCancelled).toHaveBeenCalledWith(
        expect.anything(),
        'payment_failed',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and publish event', async () => {
      const activeOrder = {
        ...mockOrder,
        status: OrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(activeOrder as Order);
      orderRepository.save.mockResolvedValue({
        ...activeOrder,
        status: OrderStatus.CANCELLED,
      } as Order);
      orderEventRepository.save.mockResolvedValue({} as OrderEvent);

      const result = await service.cancelOrder('order-123');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(eventService.publishOrderCancelled).toHaveBeenCalled();
    });

    it('should throw error if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelOrder('order-123')).rejects.toThrow('Order not found');
    });

    it('should throw error if order is shipped', async () => {
      const shippedOrder = {
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      };

      orderRepository.findOne.mockResolvedValue(shippedOrder as Order);

      await expect(service.cancelOrder('order-123')).rejects.toThrow(
        'Cannot cancel order in current status',
      );
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const cart = {
        ...mockOrder,
        items: [
          {
            id: 'item-123',
            orderId: 'order-123',
            productId: 'product-123',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            order: mockOrder,
            createdAt: new Date(),
          },
        ],
        totalAmount: 59.98,
      };

      redisService.getCart.mockResolvedValue(cart as Order);
      orderRepository.save.mockResolvedValue({
        ...cart,
        items: [],
        totalAmount: 0,
      } as Order);

      const result = await service.removeFromCart('user-123', 'item-123');

      expect(result.items).toHaveLength(0);
      expect(result.totalAmount).toBe(0);
      expect(redisService.setCart).toHaveBeenCalledWith('user-123', expect.any(Object));
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated user orders', async () => {
      const orders = [mockOrder];
      orderRepository.findAndCount.mockResolvedValue([orders, 1]);

      const [resultOrders, total] = await service.getUserOrders('user-123', 10, 0);

      expect(resultOrders).toEqual(orders);
      expect(total).toBe(1);
    });
  });
});
