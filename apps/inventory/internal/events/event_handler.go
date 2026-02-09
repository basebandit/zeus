package events

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	"github.com/basebandit/zeus/inventory/internal/service"
)

type EventHandler struct {
	inventoryService *service.InventoryService
	rabbitMQ         *RabbitMQService
}

func NewEventHandler(inventoryService *service.InventoryService, rabbitMQ *RabbitMQService) *EventHandler {
	return &EventHandler{
		inventoryService: inventoryService,
		rabbitMQ:         rabbitMQ,
	}
}

// HandleOrderCreated processes order.created events
func (h *EventHandler) HandleOrderCreated(event *OrderCreatedEvent) error {
	log.Printf("Processing order.created event for order %s", event.OrderID)

	// Track reservations and failures
	reservedItems := make([]ReservedInventoryItem, 0, len(event.Items))
	var failedItems []FailedInventoryItem
	var reservationID uuid.UUID

	// Attempt to reserve inventory for each item
	for _, item := range event.Items {
		reservation, err := h.inventoryService.ReserveStock(item.ProductID, event.OrderID, item.Quantity)
		if err != nil {
			log.Printf("Failed to reserve stock for product %s: %v", item.ProductID, err)

			// Get available quantity for error reporting
			inv, _ := h.inventoryService.GetStock(item.ProductID)
			available := 0
			if inv != nil {
				available = inv.AvailableQuantity
			}

			failedItems = append(failedItems, FailedInventoryItem{
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Available: available,
			})
			continue
		}

		// Track successful reservation
		reservationID = reservation.ID
		reservedItems = append(reservedItems, ReservedInventoryItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		})

		// Check for low stock and publish alert
		stockInfo, _ := h.inventoryService.GetStock(item.ProductID)
		if stockInfo != nil && stockInfo.IsLowStock() {
			h.publishLowStockAlert(item.ProductID, stockInfo)
		}
	}

	// If any items failed, release successful reservations and publish failure
	if len(failedItems) > 0 {
		log.Printf("Inventory reservation failed for order %s, releasing %d successful reservations", event.OrderID, len(reservedItems))

		// Release any successful reservations
		if err := h.inventoryService.ReleaseReservationByOrderID(event.OrderID, "partial_reservation_failed"); err != nil {
			log.Printf("Error releasing reservations: %v", err)
		}

		// Publish failure event
		failureEvent := &InventoryReservationFailedEvent{
			EventType: "inventory.reservation_failed",
			OrderID:   event.OrderID,
			Items:     failedItems,
			Reason:    "Insufficient inventory for one or more items",
			Timestamp: time.Now(),
		}
		return h.rabbitMQ.PublishInventoryReservationFailed(failureEvent)
	}

	// All items reserved successfully
	log.Printf("Successfully reserved inventory for order %s", event.OrderID)
	successEvent := &InventoryReservedEvent{
		EventType:     "inventory.reserved",
		OrderID:       event.OrderID,
		ReservationID: reservationID,
		Items:         reservedItems,
		UserID:        event.UserID,
		TotalAmount:   event.TotalAmount,
		Timestamp:     time.Now(),
	}
	return h.rabbitMQ.PublishInventoryReserved(successEvent)
}

// HandleOrderCancelled processes order.cancelled events
func (h *EventHandler) HandleOrderCancelled(event *OrderCancelledEvent) error {
	log.Printf("Processing order.cancelled event for order %s, reason: %s", event.OrderID, event.Reason)

	// Release all reservations for this order
	if err := h.inventoryService.ReleaseReservationByOrderID(event.OrderID, event.Reason); err != nil {
		return fmt.Errorf("failed to release reservations: %w", err)
	}

	log.Printf("Successfully released inventory for cancelled order %s", event.OrderID)

	// TODO: Publish inventory.released event if needed by other services

	return nil
}

func (h *EventHandler) publishLowStockAlert(productID uuid.UUID, inv interface{}) {
	alertEvent := &LowStockAlertEvent{
		EventType:   "inventory.low_stock",
		ProductID:   productID,
		ProductName: "", // Could fetch product name here if needed
		Timestamp:   time.Now(),
	}
	if err := h.rabbitMQ.PublishLowStockAlert(alertEvent); err != nil {
		log.Printf("Failed to publish low stock alert: %v", err)
	}
}

// StartConsumers starts all event consumers
func (h *EventHandler) StartConsumers() error {
	return h.rabbitMQ.ConsumeOrderEvents(
		h.HandleOrderCreated,
		h.HandleOrderCancelled,
	)
}
