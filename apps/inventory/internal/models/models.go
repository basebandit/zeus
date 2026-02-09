package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Product represents a product in the catalog
type Product struct {
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	Inventory   *Inventory     `gorm:"foreignKey:ProductID" json:"inventory,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Currency    string         `gorm:"type:varchar(3);not null;default:'USD'" json:"currency"`
	SKU         string         `gorm:"type:varchar(100);unique;not null" json:"sku" binding:"required"`
	Category    string         `gorm:"type:varchar(100)" json:"category"`
	ImageURL    string         `gorm:"type:text" json:"imageUrl"`
	Price       float64        `gorm:"type:decimal(10,2);not null" json:"price" binding:"required,gt=0"`
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
}

// Inventory represents stock levels for a product
type Inventory struct {
	UpdatedAt         time.Time `json:"updatedAt"`
	Product           *Product  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	WarehouseLocation string    `gorm:"type:varchar(100);not null;default:'MAIN'" json:"warehouseLocation"`
	AvailableQuantity int       `gorm:"not null;default:0;check:available_quantity >= 0" json:"availableQuantity"`
	ReservedQuantity  int       `gorm:"not null;default:0;check:reserved_quantity >= 0" json:"reservedQuantity"`
	LowStockThreshold int       `gorm:"not null;default:10" json:"lowStockThreshold"`
	Version           int       `gorm:"not null;default:1" json:"version"`
	ID                uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProductID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"productId"`
}

// TotalQuantity is a computed field
func (i *Inventory) TotalQuantity() int {
	return i.AvailableQuantity + i.ReservedQuantity
}

// IsLowStock checks if inventory is below threshold
func (i *Inventory) IsLowStock() bool {
	return i.AvailableQuantity <= i.LowStockThreshold
}

// ReservationStatus represents the status of a reservation
type ReservationStatus string

const (
	ReservationActive    ReservationStatus = "active"
	ReservationConfirmed ReservationStatus = "confirmed"
	ReservationReleased  ReservationStatus = "released"
	ReservationExpired   ReservationStatus = "expired"
)

// Reservation represents a temporary inventory reservation
type Reservation struct {
	ExpiresAt time.Time         `gorm:"not null;index" json:"expiresAt"`
	CreatedAt time.Time         `json:"createdAt"`
	Product   *Product          `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Status    ReservationStatus `gorm:"type:varchar(20);not null" json:"status"`
	Quantity  int               `gorm:"not null;check:quantity > 0" json:"quantity"`
	ID        uuid.UUID         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProductID uuid.UUID         `gorm:"type:uuid;not null;index" json:"productId"`
	OrderID   uuid.UUID         `gorm:"type:uuid;not null;index" json:"orderId"`
}

// IsExpired checks if reservation has expired
func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt) && r.Status == ReservationActive
}

// TableName overrides the table name
func (Product) TableName() string {
	return "products"
}

func (Inventory) TableName() string {
	return "inventory"
}

func (Reservation) TableName() string {
	return "reservations"
}
