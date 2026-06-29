export interface ShipmentShippedEvent {
  eventType: 'shipment.shipped';
  shipmentId: string;
  orderId: string;
  userId: string;
  trackingNumber: string;
  carrier?: string;
  timestamp: string;
}

export interface ShipmentDeliveredEvent {
  eventType: 'shipment.delivered';
  shipmentId: string;
  orderId: string;
  userId: string;
  timestamp: string;
}
