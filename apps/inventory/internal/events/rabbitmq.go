package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQService struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
}

func NewRabbitMQService(url, exchange string) (*RabbitMQService, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare topic exchange
	err = ch.ExchangeDeclare(
		exchange, // name
		"topic",  // type
		true,     // durable
		false,    // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &RabbitMQService{
		conn:     conn,
		channel:  ch,
		exchange: exchange,
	}, nil
}

// Publish publishes an event to RabbitMQ
func (r *RabbitMQService) Publish(routingKey string, event interface{}) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = r.channel.PublishWithContext(
		ctx,
		r.exchange, // exchange
		routingKey, // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
		},
	)

	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	log.Printf("Published event: %s with routing key: %s", string(body), routingKey)
	return nil
}

// PublishInventoryReserved publishes inventory.reserved event
func (r *RabbitMQService) PublishInventoryReserved(event *InventoryReservedEvent) error {
	return r.Publish("inventory.reserved", event)
}

// PublishInventoryReservationFailed publishes inventory.reservation_failed event
func (r *RabbitMQService) PublishInventoryReservationFailed(event *InventoryReservationFailedEvent) error {
	return r.Publish("inventory.reservation_failed", event)
}

// PublishInventoryReleased publishes inventory.released event
func (r *RabbitMQService) PublishInventoryReleased(event *InventoryReleasedEvent) error {
	return r.Publish("inventory.released", event)
}

// PublishInventoryConfirmed publishes inventory.confirmed event
func (r *RabbitMQService) PublishInventoryConfirmed(event *InventoryConfirmedEvent) error {
	return r.Publish("inventory.confirmed", event)
}

// PublishLowStockAlert publishes inventory.low_stock event
func (r *RabbitMQService) PublishLowStockAlert(event *LowStockAlertEvent) error {
	return r.Publish("inventory.low_stock", event)
}

// ConsumeOrderEvents consumes order.created and order.cancelled events
func (r *RabbitMQService) ConsumeOrderEvents(
	onOrderCreated func(*OrderCreatedEvent) error,
	onOrderCancelled func(*OrderCancelledEvent) error,
) error {
	// Declare queue
	queue, err := r.channel.QueueDeclare(
		"inventory.order_events", // name
		true,                     // durable
		false,                    // delete when unused
		false,                    // exclusive
		false,                    // no-wait
		map[string]interface{}{
			"x-dead-letter-exchange":    "",
			"x-dead-letter-routing-key": "inventory.order_events.dlq",
		},
	)
	if err != nil {
		return fmt.Errorf("failed to declare queue: %w", err)
	}

	// Declare DLQ
	_, err = r.channel.QueueDeclare(
		"inventory.order_events.dlq", // name
		true,                         // durable
		false,                        // delete when unused
		false,                        // exclusive
		false,                        // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare DLQ: %w", err)
	}

	// Bind queue to exchange with routing keys
	if err := r.channel.QueueBind(queue.Name, "order.created", r.exchange, false, nil); err != nil {
		return fmt.Errorf("failed to bind order.created: %w", err)
	}
	if err := r.channel.QueueBind(queue.Name, "order.cancelled", r.exchange, false, nil); err != nil {
		return fmt.Errorf("failed to bind order.cancelled: %w", err)
	}

	// Start consuming
	msgs, err := r.channel.Consume(
		queue.Name, // queue
		"",         // consumer
		false,      // auto-ack
		false,      // exclusive
		false,      // no-local
		false,      // no-wait
		nil,        // args
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	// Process messages
	go func() {
		for msg := range msgs {
			if err := r.handleOrderEvent(&msg, onOrderCreated, onOrderCancelled); err != nil {
				log.Printf("Error processing order event: %v", err)
				// Retry logic
				retryCount := getRetryCount(msg.Headers)
				if retryCount < 3 {
					if nackErr := msg.Nack(false, true); nackErr != nil {
						log.Printf("Failed to nack message: %v", nackErr)
					}
				} else {
					log.Printf("Max retries exceeded, sending to DLQ")
					if nackErr := msg.Nack(false, false); nackErr != nil {
						log.Printf("Failed to nack message to DLQ: %v", nackErr)
					}
				}
			} else {
				if ackErr := msg.Ack(false); ackErr != nil {
					log.Printf("Failed to ack message: %v", ackErr)
				}
			}
		}
	}()

	log.Println("Started consuming order events...")
	return nil
}

func (r *RabbitMQService) handleOrderEvent(
	msg *amqp.Delivery,
	onOrderCreated func(*OrderCreatedEvent) error,
	onOrderCancelled func(*OrderCancelledEvent) error,
) error {
	// Determine event type from routing key
	switch msg.RoutingKey {
	case "order.created":
		var event OrderCreatedEvent
		if err := json.Unmarshal(msg.Body, &event); err != nil {
			return fmt.Errorf("failed to unmarshal order.created event: %w", err)
		}
		return onOrderCreated(&event)

	case "order.cancelled":
		var event OrderCancelledEvent
		if err := json.Unmarshal(msg.Body, &event); err != nil {
			return fmt.Errorf("failed to unmarshal order.cancelled event: %w", err)
		}
		return onOrderCancelled(&event)

	default:
		log.Printf("Unknown routing key: %s", msg.RoutingKey)
		return nil
	}
}

func getRetryCount(headers amqp.Table) int {
	if headers == nil {
		return 0
	}
	if count, ok := headers["x-retry-count"].(int32); ok {
		return int(count)
	}
	return 0
}

// Close closes the RabbitMQ connection
func (r *RabbitMQService) Close() error {
	if err := r.channel.Close(); err != nil {
		return err
	}
	return r.conn.Close()
}
