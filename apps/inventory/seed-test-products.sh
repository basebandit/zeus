#!/bin/bash

# Seed Test Products for Inventory Service
# This script creates the test products used by the Orders service test suite

set -e

INVENTORY_URL="http://localhost:8082"

echo "Creating test products in inventory..."

# Product 1: Test Product 1
echo "Creating Product 1..."
curl -s -X POST "$INVENTORY_URL/api/v1/products" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test Product 1",
    "description": "First test product for orders",
    "price": 29.99,
    "currency": "USD",
    "sku": "TEST-PRODUCT-001",
    "category": "Test"
  }' | jq .

# Product 2: Test Product 2
echo "Creating Product 2..."
curl -s -X POST "$INVENTORY_URL/api/v1/products" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Test Product 2",
    "description": "Second test product for orders",
    "price": 29.99,
    "currency": "USD",
    "sku": "TEST-PRODUCT-002",
    "category": "Test"
  }' | jq .

echo ""
echo "Adding stock to products..."

# Add stock to Product 1
echo "Adding 100 units to Product 1..."
curl -s -X POST "$INVENTORY_URL/api/v1/inventory/550e8400-e29b-41d4-a716-446655440000/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100}' | jq .

# Add stock to Product 2
echo "Adding 100 units to Product 2..."
curl -s -X POST "$INVENTORY_URL/api/v1/inventory/660e8400-e29b-41d4-a716-446655440001/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100}' | jq .

echo ""
echo "Verifying stock levels..."

curl -s "$INVENTORY_URL/api/v1/inventory/550e8400-e29b-41d4-a716-446655440000/stock" | jq .
curl -s "$INVENTORY_URL/api/v1/inventory/660e8400-e29b-41d4-a716-446655440001/stock" | jq .

echo ""
echo "Test products seeded successfully!"
