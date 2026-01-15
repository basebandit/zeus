package events

import (
	"time"

	"github.com/google/uuid"
)

// OrderCreatedEvent is consumed when an order is created
type OrderCreatedEvent struct {
	EventType   string           `json:"eventType"`
	OrderID     uuid.UUID        `json:"orderId"`
	UserID      uuid.UUID        `json:"userId"`
	TotalAmount float64          `json:"totalAmount"`
	Items       []OrderItemEvent `json:"items"`
	Timestamp   time.Time        `json:"timestamp"`
}

type OrderItemEvent struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	UnitPrice float64   `json:"unitPrice"`
}

// OrderCancelledEvent is consumed when an order is cancelled
type OrderCancelledEvent struct {
	EventType string    `json:"eventType"`
	OrderID   uuid.UUID `json:"orderId"`
	UserID    uuid.UUID `json:"userId"`
	Reason    string    `json:"reason"`
	Timestamp time.Time `json:"timestamp"`
}

// InventoryReservedEvent is published when inventory is successfully reserved
type InventoryReservedEvent struct {
	EventType     string                     `json:"eventType"`
	OrderID       uuid.UUID                  `json:"orderId"`
	ReservationID uuid.UUID                  `json:"reservationId"`
	Items         []ReservedInventoryItem    `json:"items"`
	UserID        uuid.UUID                  `json:"userId"`
	TotalAmount   float64                    `json:"totalAmount"`
	Timestamp     time.Time                  `json:"timestamp"`
}

type ReservedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
}

// InventoryReservationFailedEvent is published when reservation fails
type InventoryReservationFailedEvent struct {
	EventType string                      `json:"eventType"`
	OrderID   uuid.UUID                   `json:"orderId"`
	Items     []FailedInventoryItem       `json:"items"`
	Reason    string                      `json:"reason"`
	Timestamp time.Time                   `json:"timestamp"`
}

type FailedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	Available int       `json:"available"`
}

// InventoryReleasedEvent is published when inventory reservation is released
type InventoryReleasedEvent struct {
	EventType string                     `json:"eventType"`
	OrderID   uuid.UUID                  `json:"orderId"`
	Items     []ReservedInventoryItem    `json:"items"`
	Reason    string                     `json:"reason"`
	Timestamp time.Time                  `json:"timestamp"`
}

// InventoryConfirmedEvent is published when reservation is confirmed (stock deducted)
type InventoryConfirmedEvent struct {
	EventType string                     `json:"eventType"`
	OrderID   uuid.UUID                  `json:"orderId"`
	Items     []ReservedInventoryItem    `json:"items"`
	Timestamp time.Time                  `json:"timestamp"`
}

// LowStockAlertEvent is published when inventory falls below threshold
type LowStockAlertEvent struct {
	EventType         string    `json:"eventType"`
	ProductID         uuid.UUID `json:"productId"`
	ProductName       string    `json:"productName"`
	AvailableQuantity int       `json:"availableQuantity"`
	Threshold         int       `json:"threshold"`
	Timestamp         time.Time `json:"timestamp"`
}
