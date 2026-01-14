export interface InventoryReservedEvent {
  eventType: 'inventory.reserved';
  orderId: string;
  reservationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  timestamp: string;
}

export interface InventoryReservationFailedEvent {
  eventType: 'inventory.reservation_failed';
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
    available: number;
  }>;
  reason: string;
  timestamp: string;
}
