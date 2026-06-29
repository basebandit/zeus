import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum OrderStatus {
  CART = 'cart',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CART,
  })
  status: OrderStatus;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @Column({ type: 'jsonb', name: 'shipping_address', nullable: true })
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
    // Removing an item from the collection and saving deletes its row
    // (order_items.order_id is NOT NULL, so the default "nullify" would fail).
    orphanedRowAction: 'delete',
  })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice: number;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('order_events')
export class OrderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', name: 'event_data' })
  eventData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
