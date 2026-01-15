import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddToCartDto, CreateOrderDto } from '../dto/order.dto';
import { Order, OrderEvent, OrderItem, OrderStatus } from '../entities/order.entity';
import { EventService } from './event.service';
import { RedisService } from './redis.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderEvent)
    private orderEventRepository: Repository<OrderEvent>,
    private eventService: EventService,
    private redisService: RedisService,
  ) {}

  async getCart(userId: string): Promise<Order | null> {
    // Try cache first
    const cachedCart = await this.redisService.getCart(userId);
    if (cachedCart) {
      return cachedCart;
    }

    // Fetch from DB
    const cart = await this.orderRepository.findOne({
      where: { userId, status: OrderStatus.CART },
      relations: ['items'],
    });

    if (cart) {
      await this.redisService.setCart(userId, cart);
    }

    return cart;
  }

  async addToCart(dto: AddToCartDto): Promise<Order> {
    let cart = await this.getCart(dto.userId);

    if (!cart) {
      // Create new cart
      cart = this.orderRepository.create({
        userId: dto.userId,
        status: OrderStatus.CART,
        totalAmount: 0,
        currency: 'USD',
        shippingAddress: null as any, // Will be filled during checkout
        items: [],
      });
    }

    // Check if product already in cart
    const existingItem = cart.items?.find((item) => item.productId === dto.productId);

    if (existingItem) {
      existingItem.quantity += dto.quantity;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
    } else {
      // Fetch product details from inventory service (mocked for now)
      const productPrice = await this.getProductPrice(dto.productId);

      const newItem = this.orderItemRepository.create({
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: productPrice,
        totalPrice: productPrice * dto.quantity,
      });

      if (!cart.items) {
        cart.items = [];
      }
      cart.items.push(newItem);
    }

    // Recalculate total
    cart.totalAmount = cart.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    const savedCart = await this.orderRepository.save(cart);
    await this.redisService.setCart(dto.userId, savedCart);

    return savedCart;
  }

  async removeFromCart(userId: string, itemId: string): Promise<Order> {
    const cart = await this.getCart(userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((item) => item.id !== itemId);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    const updatedCart = await this.orderRepository.save(cart);
    await this.redisService.setCart(userId, updatedCart);

    return updatedCart;
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Start saga orchestration
    const order = this.orderRepository.create({
      userId: dto.userId,
      status: OrderStatus.PENDING,
      totalAmount: 0,
      currency: 'USD',
      shippingAddress: dto.shippingAddress,
      items: [],
    });

    // Calculate items and total
    for (const itemDto of dto.items) {
      const productPrice = await this.getProductPrice(itemDto.productId);
      const item = this.orderItemRepository.create({
        productId: itemDto.productId,
        quantity: itemDto.quantity,
        unitPrice: productPrice,
        totalPrice: productPrice * itemDto.quantity,
      });
      order.items.push(item);
    }

    order.totalAmount = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    const savedOrder = await this.orderRepository.save(order);

    // Record event
    await this.recordEvent(savedOrder.id, 'order.created', { orderId: savedOrder.id });

    // Publish event to message queue
    await this.eventService.publishOrderCreated(savedOrder);

    // Clear cart if exists
    await this.redisService.deleteCart(dto.userId);

    return savedOrder;
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, limit = 10, offset = 0): Promise<[Order[], number]> {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return [orders, total];
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrder(orderId);
    order.status = status;
    order.updatedAt = new Date();

    const updated = await this.orderRepository.save(order);
    await this.recordEvent(orderId, `order.status_changed`, { status, orderId });

    return updated;
  }

  async handlePaymentCompleted(orderId: string, paymentId: string): Promise<void> {
    const order = await this.getOrder(orderId);
    order.paymentId = paymentId;
    order.status = OrderStatus.CONFIRMED;
    await this.orderRepository.save(order);

    await this.recordEvent(orderId, 'order.confirmed', { orderId, paymentId });
    await this.eventService.publishOrderConfirmed(order);
  }

  async handlePaymentFailed(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);
    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    await this.recordEvent(orderId, 'order.cancelled', { orderId, reason: 'payment_failed' });
    await this.eventService.publishOrderCancelled(order, 'payment_failed');
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.getOrder(orderId);

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    order.status = OrderStatus.CANCELLED;
    const updated = await this.orderRepository.save(order);

    await this.recordEvent(orderId, 'order.cancelled', { orderId, reason: 'user_requested' });
    await this.eventService.publishOrderCancelled(order, 'user_requested');

    return updated;
  }

  private async recordEvent(orderId: string, eventType: string, eventData: any): Promise<void> {
    const event = this.orderEventRepository.create({
      orderId,
      eventType,
      eventData,
    });
    await this.orderEventRepository.save(event);
  }

  // Mock function - in real implementation, call inventory service
  private async getProductPrice(productId: string): Promise<number> {
    // This should call the Inventory Service API
    // For now, return mock price
    return 29.99;
  }
}
