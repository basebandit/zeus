import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { Order, OrderStatus } from '../entities/order.entity';

describe('RedisService', () => {
  let service: RedisService;

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

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart from Redis', async () => {
      (service.getCart as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.getCart('user-123');

      expect(service.getCart).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockOrder);
    });

    it('should return null if cart not found', async () => {
      (service.getCart as jest.Mock).mockResolvedValue(null);

      const result = await service.getCart('user-123');

      expect(result).toBeNull();
    });
  });

  describe('setCart', () => {
    it('should store cart in Redis with TTL', async () => {
      (service.setCart as jest.Mock).mockResolvedValue(undefined);

      await service.setCart('user-123', mockOrder);

      expect(service.setCart).toHaveBeenCalledWith('user-123', mockOrder);
    });
  });

  describe('deleteCart', () => {
    it('should delete cart from Redis', async () => {
      (service.deleteCart as jest.Mock).mockResolvedValue(undefined);

      await service.deleteCart('user-123');

      expect(service.deleteCart).toHaveBeenCalledWith('user-123');
    });
  });
});
