package events

import (
	"time"

	"github.com/google/uuid"
)

// OrderCreatedEvent is consumed when an order is created
type OrderCreatedEvent struct {
	Timestamp   time.Time        `json:"timestamp"`
	EventType   string           `json:"eventType"`
	Items       []OrderItemEvent `json:"items"`
	TotalAmount float64          `json:"totalAmount"`
	OrderID     uuid.UUID        `json:"orderId"`
	UserID      uuid.UUID        `json:"userId"`
}

type OrderItemEvent struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	UnitPrice float64   `json:"unitPrice"`
}

// OrderCancelledEvent is consumed when an order is cancelled
type OrderCancelledEvent struct {
	Timestamp time.Time `json:"timestamp"`
	EventType string    `json:"eventType"`
	Reason    string    `json:"reason"`
	OrderID   uuid.UUID `json:"orderId"`
	UserID    uuid.UUID `json:"userId"`
}

// InventoryReservedEvent is published when inventory is successfully reserved
type InventoryReservedEvent struct {
	Timestamp     time.Time               `json:"timestamp"`
	EventType     string                  `json:"eventType"`
	Items         []ReservedInventoryItem `json:"items"`
	TotalAmount   float64                 `json:"totalAmount"`
	OrderID       uuid.UUID               `json:"orderId"`
	ReservationID uuid.UUID               `json:"reservationId"`
	UserID        uuid.UUID               `json:"userId"`
}

type ReservedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
}

// InventoryReservationFailedEvent is published when reservation fails
type InventoryReservationFailedEvent struct {
	Timestamp time.Time             `json:"timestamp"`
	EventType string                `json:"eventType"`
	Reason    string                `json:"reason"`
	Items     []FailedInventoryItem `json:"items"`
	OrderID   uuid.UUID             `json:"orderId"`
}

type FailedInventoryItem struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
	Available int       `json:"available"`
}

// InventoryReleasedEvent is published when inventory reservation is released
type InventoryReleasedEvent struct {
	Timestamp time.Time               `json:"timestamp"`
	EventType string                  `json:"eventType"`
	Reason    string                  `json:"reason"`
	Items     []ReservedInventoryItem `json:"items"`
	OrderID   uuid.UUID               `json:"orderId"`
}

// InventoryConfirmedEvent is published when reservation is confirmed (stock deducted)
type InventoryConfirmedEvent struct {
	Timestamp time.Time               `json:"timestamp"`
	EventType string                  `json:"eventType"`
	Items     []ReservedInventoryItem `json:"items"`
	OrderID   uuid.UUID               `json:"orderId"`
}

// LowStockAlertEvent is published when inventory falls below threshold
type LowStockAlertEvent struct {
	Timestamp         time.Time `json:"timestamp"`
	EventType         string    `json:"eventType"`
	ProductName       string    `json:"productName"`
	Threshold         int       `json:"threshold"`
	AvailableQuantity int       `json:"availableQuantity"`
	ProductID         uuid.UUID `json:"productId"`
}
