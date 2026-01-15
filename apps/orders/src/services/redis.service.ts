import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Order } from '../entities/order.entity';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;
  private readonly CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async getCart(userId: string): Promise<Order | null> {
    try {
      const key = `cart:${userId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get cart for user ${userId}:`, error);
      return null;
    }
  }

  async setCart(userId: string, cart: Order): Promise<void> {
    try {
      const key = `cart:${userId}`;
      await this.redis.setex(key, this.CART_TTL, JSON.stringify(cart));
    } catch (error) {
      this.logger.error(`Failed to set cart for user ${userId}:`, error);
    }
  }

  async deleteCart(userId: string): Promise<void> {
    try {
      const key = `cart:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cart for user ${userId}:`, error);
    }
  }
}
