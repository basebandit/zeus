export interface PaymentCompletedEvent {
  eventType: 'payment.completed';
  orderId: string;
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  timestamp: string;
}

export interface PaymentFailedEvent {
  eventType: 'payment.failed';
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  errorCode?: string;
  timestamp: string;
}
