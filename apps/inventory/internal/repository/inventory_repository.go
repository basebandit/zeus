package repository

import (
	"time"

	"github.com/basebandit/zeus/inventory/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

// GetInventoryByProductID retrieves inventory for a product
func (r *InventoryRepository) GetInventoryByProductID(productID uuid.UUID) (*models.Inventory, error) {
	var inv models.Inventory
	if err := r.db.Where("product_id = ?", productID).First(&inv).Error; err != nil {
		return nil, err
	}
	return &inv, nil
}

// ReserveWithOptimisticLock attempts to reserve stock using optimistic locking
func (r *InventoryRepository) ReserveWithOptimisticLock(inv *models.Inventory, quantity int, reservation *models.Reservation) (bool, error) {
	return r.executeInTransaction(func(tx *gorm.DB) (bool, error) {
		// Update inventory with version check (optimistic locking)
		result := tx.Model(&models.Inventory{}).
			Where("product_id = ? AND version = ?", inv.ProductID, inv.Version).
			Updates(map[string]interface{}{
				"available_quantity": inv.AvailableQuantity - quantity,
				"reserved_quantity":  inv.ReservedQuantity + quantity,
				"version":            inv.Version + 1,
				"updated_at":         time.Now(),
			})

		if result.Error != nil {
			return false, result.Error
		}

		// Version conflict detected
		if result.RowsAffected == 0 {
			return false, nil
		}

		// Create reservation record
		if err := tx.Create(reservation).Error; err != nil {
			return false, err
		}

		return true, nil
	})
}

// ReleaseReservation releases a reservation and returns stock to available
func (r *InventoryRepository) ReleaseReservation(reservation *models.Reservation, reason string) error {
	_, err := r.executeInTransaction(func(tx *gorm.DB) (bool, error) {
		// Update inventory - move from reserved back to available
		if err := tx.Exec(`
			UPDATE inventory
			SET available_quantity = available_quantity + ?,
				reserved_quantity = reserved_quantity - ?,
				updated_at = ?
			WHERE product_id = ?`,
			reservation.Quantity,
			reservation.Quantity,
			time.Now(),
			reservation.ProductID,
		).Error; err != nil {
			return false, err
		}

		// Update reservation status
		if err := tx.Model(reservation).Updates(map[string]interface{}{
			"status": models.ReservationReleased,
		}).Error; err != nil {
			return false, err
		}

		return true, nil
	})
	return err
}

// ConfirmReservation confirms a reservation (keeps stock as reserved, updates status)
func (r *InventoryRepository) ConfirmReservation(reservation *models.Reservation) error {
	_, err := r.executeInTransaction(func(tx *gorm.DB) (bool, error) {
		// Simply update reservation status - stock stays reserved and will be shipped
		if err := tx.Model(reservation).Updates(map[string]interface{}{
			"status": models.ReservationConfirmed,
		}).Error; err != nil {
			return false, err
		}

		return true, nil
	})
	return err
}

// ReleaseExpiredReservations releases all expired active reservations
func (r *InventoryRepository) ReleaseExpiredReservations() (int, error) {
	count := 0
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// Find all expired active reservations
		var reservations []models.Reservation
		if err := tx.Where("status = ? AND expires_at < ?", models.ReservationActive, time.Now()).
			Find(&reservations).Error; err != nil {
			return err
		}

		count = len(reservations)

		// Release each reservation
		for _, reservation := range reservations {
			// Update inventory
			if err := tx.Exec(`
				UPDATE inventory
				SET available_quantity = available_quantity + ?,
					reserved_quantity = reserved_quantity - ?,
					updated_at = ?
				WHERE product_id = ?`,
				reservation.Quantity,
				reservation.Quantity,
				time.Now(),
				reservation.ProductID,
			).Error; err != nil {
				return err
			}

			// Update reservation status
			if err := tx.Model(&reservation).Update("status", models.ReservationExpired).Error; err != nil {
				return err
			}
		}

		return nil
	})

	return count, err
}

// GetReservationByID retrieves a reservation by ID
func (r *InventoryRepository) GetReservationByID(id uuid.UUID) (*models.Reservation, error) {
	var reservation models.Reservation
	if err := r.db.Where("id = ?", id).First(&reservation).Error; err != nil {
		return nil, err
	}
	return &reservation, nil
}

// GetReservationsByOrderID retrieves all reservations for an order
func (r *InventoryRepository) GetReservationsByOrderID(orderID uuid.UUID) ([]models.Reservation, error) {
	var reservations []models.Reservation
	if err := r.db.Where("order_id = ?", orderID).Find(&reservations).Error; err != nil {
		return nil, err
	}
	return reservations, nil
}

// AddStock adds stock to inventory (admin operation)
func (r *InventoryRepository) AddStock(productID uuid.UUID, quantity int) error {
	return r.db.Exec(`
		UPDATE inventory
		SET available_quantity = available_quantity + ?,
			updated_at = ?
		WHERE product_id = ?`,
		quantity,
		time.Now(),
		productID,
	).Error
}

// Helper function to execute operations in a transaction
func (r *InventoryRepository) executeInTransaction(fn func(*gorm.DB) (bool, error)) (bool, error) {
	var success bool
	err := r.db.Transaction(func(tx *gorm.DB) error {
		result, txErr := fn(tx)
		success = result
		return txErr
	})
	return success, err
}

// Product operations

func (r *InventoryRepository) CreateProduct(product *models.Product) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Create product
		if err := tx.Create(product).Error; err != nil {
			return err
		}

		// Create associated inventory record
		inventory := &models.Inventory{
			ProductID:         product.ID,
			AvailableQuantity: 0,
			ReservedQuantity:  0,
			LowStockThreshold: 10,
		}
		return tx.Create(inventory).Error
	})
}

func (r *InventoryRepository) GetProduct(id uuid.UUID) (*models.Product, error) {
	var product models.Product
	if err := r.db.Preload("Inventory").First(&product, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *InventoryRepository) ListProducts(limit, offset int) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	if err := r.db.Model(&models.Product{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Preload("Inventory").Limit(limit).Offset(offset).Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *InventoryRepository) UpdateProduct(product *models.Product) error {
	return r.db.Save(product).Error
}

func (r *InventoryRepository) DeleteProduct(id uuid.UUID) error {
	return r.db.Delete(&models.Product{}, "id = ?", id).Error
}
