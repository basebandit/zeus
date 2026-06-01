import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { Order } from '../entities/order.entity';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private channelWrapper: ChannelWrapper;
  private readonly exchange = 'basebandit.events';

  constructor() {
    const connection = amqp.connect([process.env.RABBITMQ_URL || 'amqp://localhost']);

    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
        return;
      },
    });

    this.channelWrapper.on('connect', () => {
      this.logger.log('Connected to RabbitMQ');
    });

    this.channelWrapper.on('error', (err) => {
      this.logger.error('RabbitMQ connection error:', err);
    });
  }

  async publishOrderCreated(order: Order): Promise<void> {
    const event = {
      eventType: 'order.created',
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      timestamp: new Date().toISOString(),
    };

    await this.publish('order.created', event);
  }

  async publishOrderConfirmed(order: Order): Promise<void> {
    const event = {
      eventType: 'order.confirmed',
      orderId: order.id,
      userId: order.userId,
      paymentId: order.paymentId,
      // Forwarded so the shipping service can create a shipment for this address.
      shippingAddress: order.shippingAddress,
      timestamp: new Date().toISOString(),
    };

    await this.publish('order.confirmed', event);
  }

  async publishOrderCancelled(order: Order, reason: string): Promise<void> {
    const event = {
      eventType: 'order.cancelled',
      orderId: order.id,
      userId: order.userId,
      reason,
      timestamp: new Date().toISOString(),
    };

    await this.publish('order.cancelled', event);
  }

  async publishOrderShipped(order: Order, trackingNumber: string): Promise<void> {
    const event = {
      eventType: 'order.shipped',
      orderId: order.id,
      userId: order.userId,
      trackingNumber,
      timestamp: new Date().toISOString(),
    };

    await this.publish('order.shipped', event);
  }

  async publishOrderDelivered(order: Order): Promise<void> {
    const event = {
      eventType: 'order.delivered',
      orderId: order.id,
      userId: order.userId,
      timestamp: new Date().toISOString(),
    };

    await this.publish('order.delivered', event);
  }

  private async publish(routingKey: string, message: any): Promise<void> {
    try {
      await this.channelWrapper.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          contentType: 'application/json',
          deliveryMode: 2, // persistent messages
        },
      );
      this.logger.log(`Published event: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}:`, error);
      throw error;
    }
  }

  async consumePaymentEvents(
    onPaymentCompleted: (msg: any) => Promise<void>,
    onPaymentFailed: (msg: any) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      const queue = 'orders.payment_events';
      const dlq = 'orders.payment_events.dlq';

      // Create dead letter queue
      await channel.assertQueue(dlq, { durable: true });

      // Create main queue with DLQ configuration
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': dlq,
          'x-message-ttl': 60000, // 60 seconds TTL for retries
        },
      });

      await channel.bindQueue(queue, this.exchange, 'payment.completed');
      await channel.bindQueue(queue, this.exchange, 'payment.failed');

      this.logger.log('Consuming payment events...');

      await channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            const eventType = event.eventType;

            if (eventType === 'payment.completed') {
              await onPaymentCompleted(msg);
            } else if (eventType === 'payment.failed') {
              await onPaymentFailed(msg);
            }

            channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing payment event:', error);

            const headers = msg.properties.headers || {};
            const retryCount = (headers['x-retry-count'] || 0) + 1;
            const maxRetries = 3;

            if (retryCount >= maxRetries) {
              this.logger.error(`Max retries reached for message, sending to DLQ`);
              channel.nack(msg, false, false); // Send to DLQ
            } else {
              // Reject and requeue with incremented retry count
              channel.publish('', queue, msg.content, {
                ...msg.properties,
                headers: {
                  ...headers,
                  'x-retry-count': retryCount,
                },
              });
              channel.ack(msg); // Acknowledge original message
            }
          }
        },
        { noAck: false },
      );
    });
  }

  async consumeShipmentEvents(
    onShipmentShipped: (msg: any) => Promise<void>,
    onShipmentDelivered: (msg: any) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      const queue = 'orders.shipment_events';
      const dlq = 'orders.shipment_events.dlq';

      // Create dead letter queue
      await channel.assertQueue(dlq, { durable: true });

      // Create main queue with DLQ configuration
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': dlq,
          'x-message-ttl': 60000,
        },
      });

      await channel.bindQueue(queue, this.exchange, 'shipment.shipped');
      await channel.bindQueue(queue, this.exchange, 'shipment.delivered');

      this.logger.log('Consuming shipment events...');

      await channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            const eventType = event.eventType;

            if (eventType === 'shipment.shipped') {
              await onShipmentShipped(msg);
            } else if (eventType === 'shipment.delivered') {
              await onShipmentDelivered(msg);
            }

            channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing shipment event:', error);

            const headers = msg.properties.headers || {};
            const retryCount = (headers['x-retry-count'] || 0) + 1;
            const maxRetries = 3;

            if (retryCount >= maxRetries) {
              this.logger.error(`Max retries reached for message, sending to DLQ`);
              channel.nack(msg, false, false);
            } else {
              channel.publish('', queue, msg.content, {
                ...msg.properties,
                headers: {
                  ...headers,
                  'x-retry-count': retryCount,
                },
              });
              channel.ack(msg);
            }
          }
        },
        { noAck: false },
      );
    });
  }

  async consumeInventoryEvents(
    onInventoryReserved: (msg: any) => Promise<void>,
    onReservationFailed: (msg: any) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      const queue = 'orders.inventory_events';
      const dlq = 'orders.inventory_events.dlq';

      // Create dead letter queue
      await channel.assertQueue(dlq, { durable: true });

      // Create main queue with DLQ configuration
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': dlq,
          'x-message-ttl': 60000,
        },
      });

      await channel.bindQueue(queue, this.exchange, 'inventory.reserved');
      await channel.bindQueue(queue, this.exchange, 'inventory.reservation_failed');

      this.logger.log('Consuming inventory events...');

      await channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            const eventType = event.eventType;

            if (eventType === 'inventory.reserved') {
              await onInventoryReserved(msg);
            } else if (eventType === 'inventory.reservation_failed') {
              await onReservationFailed(msg);
            }

            channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing inventory event:', error);

            const headers = msg.properties.headers || {};
            const retryCount = (headers['x-retry-count'] || 0) + 1;
            const maxRetries = 3;

            if (retryCount >= maxRetries) {
              this.logger.error(`Max retries reached for message, sending to DLQ`);
              channel.nack(msg, false, false);
            } else {
              channel.publish('', queue, msg.content, {
                ...msg.properties,
                headers: {
                  ...headers,
                  'x-retry-count': retryCount,
                },
              });
              channel.ack(msg);
            }
          }
        },
        { noAck: false },
      );
    });
  }
}
