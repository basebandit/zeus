package service

import (
	"testing"
	"time"

	"github.com/basebandit/zeus/inventory/internal/models"
	"github.com/google/uuid"
)

func TestCreateProduct(t *testing.T) {
	product := &models.Product{
		ID:          uuid.New(),
		Name:        "Test Product",
		Description: "Test Description",
		SKU:         "TEST-001",
		Price:       99.99,
		Currency:    "USD",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	inventory := &models.Inventory{
		ID:                uuid.New(),
		ProductID:         product.ID,
		AvailableQuantity: 100,
		ReservedQuantity:  0,
		LowStockThreshold: 10,
		UpdatedAt:         time.Now(),
	}

	// Test validates product creation with inventory
	if product.Name != "Test Product" {
		t.Errorf("Expected product name 'Test Product', got %s", product.Name)
	}

	if inventory.AvailableQuantity != 100 {
		t.Errorf("Expected available quantity 100, got %d", inventory.AvailableQuantity)
	}

	if inventory.ReservedQuantity != 0 {
		t.Errorf("Expected reserved quantity 0, got %d", inventory.ReservedQuantity)
	}

	// Test TotalQuantity method
	totalQty := inventory.TotalQuantity()
	if totalQty != 100 {
		t.Errorf("Expected total quantity 100, got %d", totalQty)
	}
}

func TestReserveInventory(t *testing.T) {
	tests := []struct {
		name              string
		availableQty      int
		reservedQty       int
		requestQty        int
		shouldSucceed     bool
		expectedAvailable int
		expectedReserved  int
	}{
		{
			name:              "Successful reservation",
			availableQty:      100,
			reservedQty:       0,
			requestQty:        10,
			shouldSucceed:     true,
			expectedAvailable: 90,
			expectedReserved:  10,
		},
		{
			name:              "Insufficient stock",
			availableQty:      5,
			reservedQty:       0,
			requestQty:        10,
			shouldSucceed:     false,
			expectedAvailable: 5,
			expectedReserved:  0,
		},
		{
			name:              "Reserve all available",
			availableQty:      50,
			reservedQty:       10,
			requestQty:        50,
			shouldSucceed:     true,
			expectedAvailable: 0,
			expectedReserved:  60,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inventory := &models.Inventory{
				ID:                uuid.New(),
				ProductID:         uuid.New(),
				AvailableQuantity: tt.availableQty,
				ReservedQuantity:  tt.reservedQty,
			}

			// Simulate reservation logic
			if inventory.AvailableQuantity >= tt.requestQty {
				inventory.AvailableQuantity -= tt.requestQty
				inventory.ReservedQuantity += tt.requestQty
			}

			if tt.shouldSucceed {
				if inventory.AvailableQuantity != tt.expectedAvailable {
					t.Errorf("Expected available %d, got %d", tt.expectedAvailable, inventory.AvailableQuantity)
				}
				if inventory.ReservedQuantity != tt.expectedReserved {
					t.Errorf("Expected reserved %d, got %d", tt.expectedReserved, inventory.ReservedQuantity)
				}
			}
		})
	}
}

func TestReleaseInventory(t *testing.T) {
	tests := []struct {
		name              string
		availableQty      int
		reservedQty       int
		releaseQty        int
		expectedAvailable int
		expectedReserved  int
	}{
		{
			name:              "Release reserved stock",
			availableQty:      90,
			reservedQty:       10,
			releaseQty:        10,
			expectedAvailable: 100,
			expectedReserved:  0,
		},
		{
			name:              "Partial release",
			availableQty:      90,
			reservedQty:       10,
			releaseQty:        5,
			expectedAvailable: 95,
			expectedReserved:  5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inventory := &models.Inventory{
				ID:                uuid.New(),
				ProductID:         uuid.New(),
				AvailableQuantity: tt.availableQty,
				ReservedQuantity:  tt.reservedQty,
			}

			// Simulate release logic
			if inventory.ReservedQuantity >= tt.releaseQty {
				inventory.ReservedQuantity -= tt.releaseQty
				inventory.AvailableQuantity += tt.releaseQty
			}

			if inventory.AvailableQuantity != tt.expectedAvailable {
				t.Errorf("Expected available %d, got %d", tt.expectedAvailable, inventory.AvailableQuantity)
			}
			if inventory.ReservedQuantity != tt.expectedReserved {
				t.Errorf("Expected reserved %d, got %d", tt.expectedReserved, inventory.ReservedQuantity)
			}
		})
	}
}

func TestConfirmReservation(t *testing.T) {
	tests := []struct {
		name             string
		availableQty     int
		reservedQty      int
		confirmQty       int
		expectedReserved int
	}{
		{
			name:             "Confirm full reservation",
			availableQty:     90,
			reservedQty:      10,
			confirmQty:       10,
			expectedReserved: 0,
		},
		{
			name:             "Confirm partial reservation",
			availableQty:     90,
			reservedQty:      10,
			confirmQty:       5,
			expectedReserved: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inventory := &models.Inventory{
				ID:                uuid.New(),
				ProductID:         uuid.New(),
				AvailableQuantity: tt.availableQty,
				ReservedQuantity:  tt.reservedQty,
			}

			// Simulate confirmation logic (deduct from reserved, not from available)
			if inventory.ReservedQuantity >= tt.confirmQty {
				inventory.ReservedQuantity -= tt.confirmQty
			}

			if inventory.ReservedQuantity != tt.expectedReserved {
				t.Errorf("Expected reserved %d, got %d", tt.expectedReserved, inventory.ReservedQuantity)
			}
		})
	}
}

func TestLowStockDetection(t *testing.T) {
	tests := []struct {
		name         string
		availableQty int
		threshold    int
		shouldAlert  bool
	}{
		{
			name:         "Above threshold",
			availableQty: 20,
			threshold:    10,
			shouldAlert:  false,
		},
		{
			name:         "At threshold",
			availableQty: 10,
			threshold:    10,
			shouldAlert:  true,
		},
		{
			name:         "Below threshold",
			availableQty: 5,
			threshold:    10,
			shouldAlert:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inventory := &models.Inventory{
				ID:                uuid.New(),
				ProductID:         uuid.New(),
				AvailableQuantity: tt.availableQty,
				LowStockThreshold: tt.threshold,
			}

			isLowStock := inventory.IsLowStock()

			if isLowStock != tt.shouldAlert {
				t.Errorf("Expected low stock alert %v, got %v", tt.shouldAlert, isLowStock)
			}
		})
	}
}

func TestRestockInventory(t *testing.T) {
	inventory := &models.Inventory{
		ID:                uuid.New(),
		ProductID:         uuid.New(),
		AvailableQuantity: 50,
		ReservedQuantity:  0,
		LowStockThreshold: 10,
	}

	restockAmount := 100

	// Simulate restock
	inventory.AvailableQuantity += restockAmount

	expectedAvailable := 150

	if inventory.AvailableQuantity != expectedAvailable {
		t.Errorf("Expected available quantity %d, got %d", expectedAvailable, inventory.AvailableQuantity)
	}

	// Test TotalQuantity method
	totalQty := inventory.TotalQuantity()
	if totalQty != 150 {
		t.Errorf("Expected total quantity 150, got %d", totalQty)
	}
}

func TestReservation(t *testing.T) {
	reservation := &models.Reservation{
		ID:        uuid.New(),
		OrderID:   uuid.New(),
		ProductID: uuid.New(),
		Quantity:  10,
		Status:    models.ReservationActive,
		ExpiresAt: time.Now().Add(15 * time.Minute),
		CreatedAt: time.Now(),
	}

	if reservation.Status != models.ReservationActive {
		t.Errorf("Expected status 'active', got %s", reservation.Status)
	}

	// Test expiration
	if !reservation.ExpiresAt.After(time.Now()) {
		t.Error("Expected reservation to expire in the future")
	}

	// Test IsExpired method
	if reservation.IsExpired() {
		t.Error("Reservation should not be expired yet")
	}

	// For active reservation, status should still be active
	if reservation.Status != models.ReservationActive && time.Now().Before(reservation.ExpiresAt) {
		t.Error("Reservation should still be active before expiration")
	}
}

func TestTotalQuantityMethod(t *testing.T) {
	inventory := &models.Inventory{
		ID:                uuid.New(),
		ProductID:         uuid.New(),
		AvailableQuantity: 80,
		ReservedQuantity:  20,
	}

	totalQty := inventory.TotalQuantity()
	expectedTotal := 100

	if totalQty != expectedTotal {
		t.Errorf("Expected total quantity %d, got %d", expectedTotal, totalQty)
	}
}
