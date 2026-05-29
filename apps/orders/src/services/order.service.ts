import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AddToCartDto, CreateOrderDto } from '../dto/order.dto';
import { Order, OrderEvent, OrderItem, OrderStatus } from '../entities/order.entity';
import { EventService } from './event.service';
import { RedisService } from './redis.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly inventoryUrl = process.env.INVENTORY_URL || 'http://localhost:8082';

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

  async updateCartItemQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<Order> {
    const cart = await this.orderRepository.findOne({
      where: { userId, status: OrderStatus.CART },
      relations: ['items'],
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      // Treat a non-positive quantity as a removal.
      await this.orderItemRepository.delete({ id: itemId });
      cart.items = cart.items.filter((i) => i.id !== itemId);
    } else {
      item.quantity = quantity;
      item.totalPrice = Number(item.unitPrice) * quantity;
      await this.orderItemRepository.save(item);
    }

    cart.totalAmount = cart.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const updatedCart = await this.orderRepository.save(cart);
    await this.redisService.setCart(userId, updatedCart);

    return updatedCart;
  }

  async removeFromCart(userId: string, itemId: string): Promise<Order> {
    // Load the cart from the DB (not the cache) so we operate on a managed entity.
    const cart = await this.orderRepository.findOne({
      where: { userId, status: OrderStatus.CART },
      relations: ['items'],
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Delete the line item directly, then recompute the cart total.
    await this.orderItemRepository.delete({ id: itemId });
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

    // Clear the cart now that it has been converted into an order: remove the
    // cart-status order (cascades to its items) and the cached copy.
    const cart = await this.orderRepository.findOne({
      where: { userId: dto.userId, status: OrderStatus.CART },
      relations: ['items'],
    });
    if (cart) {
      // Remove child items first: the FK has no ON DELETE CASCADE.
      if (cart.items?.length) {
        await this.orderItemRepository.remove(cart.items);
      }
      await this.orderRepository.remove(cart);
    }
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
      // A cart is an Order with status CART; it is not a placed order.
      where: { userId, status: Not(OrderStatus.CART) },
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

  async handleShipmentShipped(orderId: string, trackingNumber: string): Promise<void> {
    const order = await this.getOrder(orderId);
    order.status = OrderStatus.SHIPPED;
    await this.orderRepository.save(order);

    await this.recordEvent(orderId, 'order.shipped', { orderId, trackingNumber });
    await this.eventService.publishOrderShipped(order, trackingNumber);
  }

  async handleShipmentDelivered(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);
    order.status = OrderStatus.DELIVERED;
    await this.orderRepository.save(order);

    await this.recordEvent(orderId, 'order.delivered', { orderId });
    await this.eventService.publishOrderDelivered(order);
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

  // Fetch the authoritative unit price from the Inventory service.
  private async getProductPrice(productId: string): Promise<number> {
    try {
      const res = await fetch(`${this.inventoryUrl}/api/v1/products/${productId}`);
      if (!res.ok) {
        throw new Error(`inventory responded ${res.status}`);
      }
      const product = (await res.json()) as { price?: number | string };
      const price = Number(product?.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`invalid price for product ${productId}`);
      }
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for product ${productId}: ${error}`);
      throw new BadRequestException(`Unable to price product ${productId}`);
    }
  }
}
