import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto, AddToCartDto, OrderResponseDto } from '../dto/order.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  @Get()
  @ApiOperation({ summary: 'List user orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getUserOrders(
    @Query('userId') userId: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    const [orders, total] = await this.orderService.getUserOrders(userId, limit, offset);
    return {
      data: orders,
      total,
      limit,
      offset,
    };
  }

  @Put(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@Param('orderId') orderId: string) {
    return this.orderService.cancelOrder(orderId);
  }
}

@ApiTags('cart')
@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Get shopping cart' })
  @ApiResponse({ status: 200, description: 'Shopping cart details' })
  async getCart(@Query('userId') userId: string) {
    const cart = await this.orderService.getCart(userId);
    return cart || { items: [], totalAmount: 0 };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addToCart(@Body() dto: AddToCartDto) {
    return this.orderService.addToCart(dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeFromCart(@Query('userId') userId: string, @Param('itemId') itemId: string) {
    return this.orderService.removeFromCart(userId, itemId);
  }
}

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('healthz')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return { status: 'healthy', service: 'orders' };
  }
}
