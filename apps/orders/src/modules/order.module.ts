import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem, OrderEvent } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { EventService } from '../services/event.service';
import { RedisService } from '../services/redis.service';
import { OrderController, CartController } from '../controllers/order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, OrderEvent])],
  controllers: [OrderController, CartController],
  providers: [OrderService, EventService, RedisService],
  exports: [OrderService, EventService, RedisService],
})
export class OrderModule {}
