package handler

import (
	"net/http"
	"time"

	"github.com/basebandit/zeus/inventory/internal/events"
	"github.com/basebandit/zeus/inventory/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InventoryHandler struct {
	inventoryService *service.InventoryService
	rabbitMQ         *events.RabbitMQService
}

func NewInventoryHandler(inventoryService *service.InventoryService, rabbitMQ *events.RabbitMQService) *InventoryHandler {
	return &InventoryHandler{
		inventoryService: inventoryService,
		rabbitMQ:         rabbitMQ,
	}
}

// ReserveStockRequest represents the request to reserve inventory
type ReserveStockRequest struct {
	ProductID uuid.UUID `json:"productId" binding:"required"`
	OrderID   uuid.UUID `json:"orderId" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,gt=0"`
}

// ReleaseReservationRequest represents the request to release a reservation
type ReleaseReservationRequest struct {
	ReservationID uuid.UUID `json:"reservationId" binding:"required"`
	Reason        string    `json:"reason"`
}

// AddStockRequest represents the request to add stock
type AddStockRequest struct {
	Quantity int `json:"quantity" binding:"required,gt=0"`
}

// ReserveStock reserves inventory
// @Summary Reserve inventory stock
// @Description Reserve a specific quantity of a product for an order
// @Tags inventory
// @Accept json
// @Produce json
// @Param request body ReserveStockRequest true "Reserve stock request"
// @Success 201 {object} models.Reservation
// @Failure 400 {object} map[string]string
// @Failure 409 {object} map[string]string "Insufficient stock or concurrency conflict"
// @Failure 500 {object} map[string]string
// @Router /inventory/reserve [post]
func (h *InventoryHandler) ReserveStock(c *gin.Context) {
	var req ReserveStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reservation, err := h.inventoryService.ReserveStock(req.ProductID, req.OrderID, req.Quantity)
	if err != nil {
		switch err {
		case service.ErrInsufficientStock:
			c.JSON(http.StatusConflict, gin.H{"error": "Insufficient stock available"})
		case service.ErrConcurrencyConflict:
			c.JSON(http.StatusConflict, gin.H{"error": "Concurrency conflict, please retry"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, reservation)
}

// ReleaseReservation releases a reservation
// @Summary Release inventory reservation
// @Description Release a previously made reservation, returning stock to available inventory
// @Tags inventory
// @Accept json
// @Produce json
// @Param request body ReleaseReservationRequest true "Release reservation request"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/release [post]
func (h *InventoryHandler) ReleaseReservation(c *gin.Context) {
	var req ReleaseReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.inventoryService.ReleaseReservation(req.ReservationID, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservation released successfully"})
}

// ConfirmReservation confirms a reservation
// @Summary Confirm inventory reservation
// @Description Confirm a reservation, typically when an order payment is successful
// @Tags inventory
// @Accept json
// @Produce json
// @Param reservationId path string true "Reservation ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/confirm/{reservationId} [post]
func (h *InventoryHandler) ConfirmReservation(c *gin.Context) {
	reservationIDStr := c.Param("reservationId")
	reservationID, err := uuid.Parse(reservationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	if err := h.inventoryService.ConfirmReservation(reservationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Publish inventory.confirmed event
	confirmedEvent := &events.InventoryConfirmedEvent{
		EventType: "inventory.confirmed",
		// OrderID and items would need to be fetched from reservation
		Timestamp: time.Now(),
	}
	h.rabbitMQ.PublishInventoryConfirmed(confirmedEvent)

	c.JSON(http.StatusOK, gin.H{"message": "Reservation confirmed successfully"})
}

// GetStock returns current stock for a product
// @Summary Get product stock information
// @Description Get current inventory details for a specific product
// @Tags inventory
// @Accept json
// @Produce json
// @Param productId path string true "Product ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /inventory/{productId}/stock [get]
func (h *InventoryHandler) GetStock(c *gin.Context) {
	productIDStr := c.Param("productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	inventory, err := h.inventoryService.GetStock(productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"productId":         inventory.ProductID,
		"availableQuantity": inventory.AvailableQuantity,
		"reservedQuantity":  inventory.ReservedQuantity,
		"totalQuantity":     inventory.TotalQuantity(),
		"lowStockThreshold": inventory.LowStockThreshold,
		"isLowStock":        inventory.IsLowStock(),
	})
}

// AddStock adds stock to inventory (admin operation)
// @Summary Add stock to inventory
// @Description Add a specific quantity of stock to a product's inventory (admin operation)
// @Tags inventory
// @Accept json
// @Produce json
// @Param productId path string true "Product ID"
// @Param request body AddStockRequest true "Add stock request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/{productId}/add-stock [post]
func (h *InventoryHandler) AddStock(c *gin.Context) {
	productIDStr := c.Param("productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var req AddStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.inventoryService.AddStock(productID, req.Quantity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stock added successfully"})
}
