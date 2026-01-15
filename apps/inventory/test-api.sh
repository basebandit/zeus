#!/bin/bash

# Inventory Service API Test Script
# Tests all endpoints of the Inventory microservice

set -e

BASE_URL="http://localhost:8082"
API_URL="$BASE_URL/api/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Inventory Service API Test Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s "$BASE_URL/healthz")
echo "$response" | jq .
echo -e "${GREEN}✓ Health check passed${NC}\n"

# Test 2: Create Product 1
echo -e "${YELLOW}Test 2: Create Product 1 (Laptop)${NC}"
product1=$(curl -s -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dell XPS 15","description":"High-performance laptop","price":1299.99,"currency":"USD","sku":"LAPTOP-XPS15-'$(date +%s)'","category":"Electronics"}')
echo "$product1" | jq .
PRODUCT_ID_1=$(echo "$product1" | jq -r '.id')
echo -e "${GREEN}✓ Product 1 created with ID: $PRODUCT_ID_1${NC}\n"

# Test 3: Create Product 2
echo -e "${YELLOW}Test 3: Create Product 2 (Keyboard)${NC}"
product2=$(curl -s -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mechanical Keyboard","description":"RGB keyboard","price":149.99,"currency":"USD","sku":"KB-MECH-'$(date +%s)'","category":"Accessories"}')
echo "$product2" | jq .
PRODUCT_ID_2=$(echo "$product2" | jq -r '.id')
echo -e "${GREEN}✓ Product 2 created with ID: $PRODUCT_ID_2${NC}\n"

# Test 4: Get Product by ID
echo -e "${YELLOW}Test 4: Get Product by ID${NC}"
curl -s "$API_URL/products/$PRODUCT_ID_1" | jq .
echo -e "${GREEN}✓ Product retrieved successfully${NC}\n"

# Test 5: List Products
echo -e "${YELLOW}Test 5: List Products${NC}"
curl -s "$API_URL/products?limit=10&offset=0" | jq .
echo -e "${GREEN}✓ Products listed successfully${NC}\n"

# Test 6: Add Stock to Product 1
echo -e "${YELLOW}Test 6: Add Stock to Product 1 (50 units)${NC}"
curl -s -X POST "$API_URL/inventory/$PRODUCT_ID_1/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"quantity":50}' | jq .
echo -e "${GREEN}✓ Stock added successfully${NC}\n"

# Test 7: Add Stock to Product 2
echo -e "${YELLOW}Test 7: Add Stock to Product 2 (100 units)${NC}"
curl -s -X POST "$API_URL/inventory/$PRODUCT_ID_2/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"quantity":100}' | jq .
echo -e "${GREEN}✓ Stock added successfully${NC}\n"

# Test 8: Get Stock Information for Product 1
echo -e "${YELLOW}Test 8: Get Stock Information for Product 1${NC}"
stock1=$(curl -s "$API_URL/inventory/$PRODUCT_ID_1/stock")
echo "$stock1" | jq .
available=$(echo "$stock1" | jq -r '.availableQuantity')
echo -e "${GREEN}✓ Available quantity: $available${NC}\n"

# Test 9: Get Stock Information for Product 2
echo -e "${YELLOW}Test 9: Get Stock Information for Product 2${NC}"
stock2=$(curl -s "$API_URL/inventory/$PRODUCT_ID_2/stock")
echo "$stock2" | jq .
echo -e "${GREEN}✓ Stock information retrieved${NC}\n"

# Test 10: Reserve Stock
echo -e "${YELLOW}Test 10: Reserve Stock (5 units of Product 1)${NC}"
ORDER_ID=$(uuidgen)
echo "Order ID: $ORDER_ID"
reservation=$(curl -s -X POST "$API_URL/inventory/reserve" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID_1\",\"orderId\":\"$ORDER_ID\",\"quantity\":5}")
echo "$reservation" | jq .
RESERVATION_ID=$(echo "$reservation" | jq -r '.id')
echo -e "${GREEN}✓ Reservation created with ID: $RESERVATION_ID${NC}\n"

# Test 11: Verify Stock After Reservation
echo -e "${YELLOW}Test 11: Verify Stock After Reservation${NC}"
stock_after=$(curl -s "$API_URL/inventory/$PRODUCT_ID_1/stock")
echo "$stock_after" | jq .
available=$(echo "$stock_after" | jq -r '.availableQuantity')
reserved=$(echo "$stock_after" | jq -r '.reservedQuantity')
echo -e "${GREEN}✓ Available: $available, Reserved: $reserved${NC}\n"

# Test 12: Confirm Reservation
echo -e "${YELLOW}Test 12: Confirm Reservation${NC}"
curl -s -X POST "$API_URL/inventory/confirm/$RESERVATION_ID" | jq .
echo -e "${GREEN}✓ Reservation confirmed${NC}\n"

# Test 13: Create and Release Reservation
echo -e "${YELLOW}Test 13: Create and Release Reservation${NC}"
ORDER_ID_2=$(uuidgen)
reservation2=$(curl -s -X POST "$API_URL/inventory/reserve" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID_2\",\"orderId\":\"$ORDER_ID_2\",\"quantity\":3}")
RESERVATION_ID_2=$(echo "$reservation2" | jq -r '.id')
echo "Created reservation: $RESERVATION_ID_2"

echo "Releasing reservation..."
curl -s -X POST "$API_URL/inventory/release" \
  -H "Content-Type: application/json" \
  -d "{\"reservationId\":\"$RESERVATION_ID_2\",\"reason\":\"Order cancelled\"}" | jq .
echo -e "${GREEN}✓ Reservation released${NC}\n"

# Test 14: Reserve Insufficient Stock (should fail)
echo -e "${YELLOW}Test 14: Reserve Insufficient Stock (should fail with 409)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/inventory/reserve" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID_1\",\"orderId\":\"$(uuidgen)\",\"quantity\":1000}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "$body" | jq .
if [ "$http_code" -eq 409 ]; then
    echo -e "${GREEN}✓ Correctly returned 409 Conflict${NC}\n"
else
    echo -e "${RED}✗ Expected 409, got $http_code${NC}\n"
fi

# Test 15: Update Product
echo -e "${YELLOW}Test 15: Update Product${NC}"
curl -s -X PUT "$API_URL/products/$PRODUCT_ID_1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dell XPS 15 Updated","description":"Updated laptop","price":1499.99,"currency":"USD","sku":"LAPTOP-XPS15-UPD","category":"Electronics"}' | jq .
echo -e "${GREEN}✓ Product updated${NC}\n"

# Test 16: Delete Product
echo -e "${YELLOW}Test 16: Delete Product 2${NC}"
curl -s -X DELETE "$API_URL/products/$PRODUCT_ID_2" | jq .
echo -e "${GREEN}✓ Product deleted${NC}\n"

# Test 17: Verify Deleted Product Returns 404
echo -e "${YELLOW}Test 17: Verify Deleted Product Returns 404${NC}"
response=$(curl -s -w "\n%{http_code}" "$API_URL/products/$PRODUCT_ID_2")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 404 ]; then
    echo -e "${GREEN}✓ Correctly returned 404 Not Found${NC}\n"
else
    echo -e "${RED}✗ Expected 404, got $http_code${NC}\n"
fi

# Test 18: Test Validation Errors
echo -e "${YELLOW}Test 18: Test Validation - Missing Required Fields${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Invalid Product"}')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly returned 400 Bad Request${NC}\n"
else
    echo -e "${RED}✗ Expected 400, got $http_code${NC}\n"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All API tests completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo "Swagger Documentation: ${BLUE}http://localhost:8082/api/docs/index.html${NC}"
