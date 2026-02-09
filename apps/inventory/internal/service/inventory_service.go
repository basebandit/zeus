package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/basebandit/zeus/inventory/internal/models"
	"github.com/basebandit/zeus/inventory/internal/repository"
)

var (
	ErrInsufficientStock   = errors.New("insufficient stock available")
	ErrConcurrencyConflict = errors.New("concurrency conflict, please retry")
	ErrProductNotFound     = errors.New("product not found")
	ErrInventoryNotFound   = errors.New("inventory not found")
	ErrReservationNotFound = errors.New("reservation not found")
	ErrInvalidReservation  = errors.New("invalid reservation status")
)

const (
	ReservationTTL = 15 * time.Minute
	MaxRetries     = 3
)

type InventoryService struct {
	repo *repository.InventoryRepository
}

func NewInventoryService(repo *repository.InventoryRepository) *InventoryService {
	return &InventoryService{
		repo: repo,
	}
}

// ReserveStock reserves inventory for an order with optimistic locking
func (s *InventoryService) ReserveStock(productID, orderID uuid.UUID, quantity int) (*models.Reservation, error) {
	for retries := 0; retries < MaxRetries; retries++ {
		// Get current inventory
		inv, err := s.repo.GetInventoryByProductID(productID)
		if err != nil {
			return nil, fmt.Errorf("failed to get inventory: %w", err)
		}

		// Check if sufficient stock is available
		if inv.AvailableQuantity < quantity {
			return nil, ErrInsufficientStock
		}

		// Create reservation
		reservation := &models.Reservation{
			ID:        uuid.New(),
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  quantity,
			Status:    models.ReservationActive,
			ExpiresAt: time.Now().Add(ReservationTTL),
		}

		// Attempt to reserve with optimistic locking
		success, err := s.repo.ReserveWithOptimisticLock(inv, quantity, reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to reserve stock: %w", err)
		}

		if success {
			return reservation, nil
		}

		// Version conflict, retry
		time.Sleep(time.Millisecond * 10 * time.Duration(retries+1))
	}

	return nil, ErrConcurrencyConflict
}

// ReleaseReservation releases a reservation and returns stock to available
func (s *InventoryService) ReleaseReservation(reservationID uuid.UUID, reason string) error {
	reservation, err := s.repo.GetReservationByID(reservationID)
	if err != nil {
		return fmt.Errorf("failed to get reservation: %w", err)
	}

	if reservation.Status != models.ReservationActive {
		return ErrInvalidReservation
	}

	return s.repo.ReleaseReservation(reservation, reason)
}

// ReleaseReservationByOrderID releases all reservations for an order
func (s *InventoryService) ReleaseReservationByOrderID(orderID uuid.UUID, reason string) error {
	reservations, err := s.repo.GetReservationsByOrderID(orderID)
	if err != nil {
		return fmt.Errorf("failed to get reservations: %w", err)
	}

	for i := range reservations {
		if reservations[i].Status == models.ReservationActive {
			if err := s.repo.ReleaseReservation(&reservations[i], reason); err != nil {
				return fmt.Errorf("failed to release reservation %s: %w", reservations[i].ID, err)
			}
		}
	}

	return nil
}

// ConfirmReservation confirms a reservation and permanently deducts stock
func (s *InventoryService) ConfirmReservation(reservationID uuid.UUID) error {
	reservation, err := s.repo.GetReservationByID(reservationID)
	if err != nil {
		return fmt.Errorf("failed to get reservation: %w", err)
	}

	if reservation.Status != models.ReservationActive {
		return ErrInvalidReservation
	}

	return s.repo.ConfirmReservation(reservation)
}

// ReleaseExpiredReservations releases all expired active reservations
func (s *InventoryService) ReleaseExpiredReservations() (int, error) {
	return s.repo.ReleaseExpiredReservations()
}

// GetStock returns current stock information for a product
func (s *InventoryService) GetStock(productID uuid.UUID) (*models.Inventory, error) {
	return s.repo.GetInventoryByProductID(productID)
}

// CheckLowStock checks if product is below threshold and should trigger alert
func (s *InventoryService) CheckLowStock(productID uuid.UUID) (bool, error) {
	inv, err := s.repo.GetInventoryByProductID(productID)
	if err != nil {
		return false, err
	}
	return inv.IsLowStock(), nil
}

// AddStock adds stock to inventory (admin operation)
func (s *InventoryService) AddStock(productID uuid.UUID, quantity int) error {
	return s.repo.AddStock(productID, quantity)
}
