package events

import (
	"time"

	"github.com/google/uuid"
)

// OrderCreatedEvent is consumed when an order is created
type OrderCreatedEvent struct {
	Items       []OrderItemEvent `json:"items"`
	EventType   string           `json:"eventType"`
	OrderID     uuid.UUID        `json:"orderId"`
	UserID      uuid.UUID        `json:"userId"`
	Timestamp   time.Time        `json:"timestamp"`
	TotalAmount float64          `json:"totalAmount"`
}

type OrderItemEvent struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	UnitPrice float64   `json:"unitPrice"`
}

// OrderCancelledEvent is consumed when an order is cancelled
type OrderCancelledEvent struct {
	EventType string    `json:"eventType"`
	Reason    string    `json:"reason"`
	OrderID   uuid.UUID `json:"orderId"`
	UserID    uuid.UUID `json:"userId"`
	Timestamp time.Time `json:"timestamp"`
}

// InventoryReservedEvent is published when inventory is successfully reserved
type InventoryReservedEvent struct {
	Items         []ReservedInventoryItem `json:"items"`
	EventType     string                  `json:"eventType"`
	OrderID       uuid.UUID               `json:"orderId"`
	ReservationID uuid.UUID               `json:"reservationId"`
	UserID        uuid.UUID               `json:"userId"`
	Timestamp     time.Time               `json:"timestamp"`
	TotalAmount   float64                 `json:"totalAmount"`
}

type ReservedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
}

// InventoryReservationFailedEvent is published when reservation fails
type InventoryReservationFailedEvent struct {
	Items     []FailedInventoryItem `json:"items"`
	EventType string                `json:"eventType"`
	Reason    string                `json:"reason"`
	OrderID   uuid.UUID             `json:"orderId"`
	Timestamp time.Time             `json:"timestamp"`
}

type FailedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	Available int       `json:"available"`
}

// InventoryReleasedEvent is published when inventory reservation is released
type InventoryReleasedEvent struct {
	Items     []ReservedInventoryItem `json:"items"`
	EventType string                  `json:"eventType"`
	Reason    string                  `json:"reason"`
	OrderID   uuid.UUID               `json:"orderId"`
	Timestamp time.Time               `json:"timestamp"`
}

// InventoryConfirmedEvent is published when reservation is confirmed (stock deducted)
type InventoryConfirmedEvent struct {
	Items     []ReservedInventoryItem `json:"items"`
	EventType string                  `json:"eventType"`
	OrderID   uuid.UUID               `json:"orderId"`
	Timestamp time.Time               `json:"timestamp"`
}

// LowStockAlertEvent is published when inventory falls below threshold
type LowStockAlertEvent struct {
	EventType   string    `json:"eventType"`
	ProductName string    `json:"productName"`
	ProductID   uuid.UUID `json:"productId"`
	Timestamp   time.Time `json:"timestamp"`
	Threshold   int       `json:"threshold"`
	AvailableQuantity int `json:"availableQuantity"`
}
