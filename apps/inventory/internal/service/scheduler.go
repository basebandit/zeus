package service

import (
	"log"
	"time"
)

type ReservationScheduler struct {
	inventoryService *InventoryService
	ticker           *time.Ticker
	done             chan bool
}

func NewReservationScheduler(inventoryService *InventoryService) *ReservationScheduler {
	return &ReservationScheduler{
		inventoryService: inventoryService,
		done:             make(chan bool),
	}
}

// Start begins the background job to release expired reservations
func (s *ReservationScheduler) Start() {
	// Run every 1 minute
	s.ticker = time.NewTicker(1 * time.Minute)

	go func() {
		log.Println("Reservation expiration scheduler started (runs every 1 minute)")

		// Run immediately on start
		s.releaseExpiredReservations()

		for {
			select {
			case <-s.ticker.C:
				s.releaseExpiredReservations()
			case <-s.done:
				log.Println("Reservation expiration scheduler stopped")
				return
			}
		}
	}()
}

func (s *ReservationScheduler) releaseExpiredReservations() {
	log.Println("Checking for expired reservations...")

	count, err := s.inventoryService.ReleaseExpiredReservations()
	if err != nil {
		log.Printf("Error releasing expired reservations: %v", err)
		return
	}

	if count > 0 {
		log.Printf("Released %d expired reservations", count)
	} else {
		log.Println("No expired reservations found")
	}
}

// Stop stops the background job
func (s *ReservationScheduler) Stop() {
	if s.ticker != nil {
		s.ticker.Stop()
	}
	s.done <- true
}
