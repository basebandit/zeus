import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { Order, OrderStatus } from '../entities/order.entity';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let redisMock: jest.Mocked<Redis>;

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
    redisMock = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => redisMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart from Redis', async () => {
      redisMock.get.mockResolvedValue(JSON.stringify(mockOrder));

      const result = await service.getCart('user-123');

      expect(redisMock.get).toHaveBeenCalledWith('cart:user-123');
      expect(result).toEqual(mockOrder);
    });

    it('should return null if cart not found', async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await service.getCart('user-123');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      redisMock.get.mockResolvedValue('invalid-json');

      await expect(service.getCart('user-123')).rejects.toThrow();
    });
  });

  describe('setCart', () => {
    it('should store cart in Redis with TTL', async () => {
      redisMock.setex.mockResolvedValue('OK');

      await service.setCart('user-123', mockOrder);

      expect(redisMock.setex).toHaveBeenCalledWith(
        'cart:user-123',
        604800, // 7 days in seconds
        JSON.stringify(mockOrder),
      );
    });
  });

  describe('deleteCart', () => {
    it('should delete cart from Redis', async () => {
      redisMock.del.mockResolvedValue(1);

      await service.deleteCart('user-123');

      expect(redisMock.del).toHaveBeenCalledWith('cart:user-123');
    });
  });
});
