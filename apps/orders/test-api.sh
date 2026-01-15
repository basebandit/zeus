#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:8080}"
USER_ID="123e4567-e89b-12d3-a456-426614174000"
PRODUCT_ID_1="550e8400-e29b-41d4-a716-446655440000"
PRODUCT_ID_2="660e8400-e29b-41d4-a716-446655440001"

echo -e "${BLUE}=== Orders Service API Test Suite ===${NC}\n"

# Test 1: Health Check
echo -e "${GREEN}1. Health Check${NC}"
curl -s -X GET "$BASE_URL/healthz" | jq '.'
echo -e "\n"

# Test 2: Add first item to cart
echo -e "${GREEN}2. Add Item to Cart (Product 1)${NC}"
CART_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"productId\": \"$PRODUCT_ID_1\",
    \"quantity\": 2
  }")
echo "$CART_RESPONSE" | jq '.'
echo -e "\n"

# Test 3: Add second item to cart
echo -e "${GREEN}3. Add Another Item to Cart (Product 2)${NC}"
curl -s -X POST "$BASE_URL/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"productId\": \"$PRODUCT_ID_2\",
    \"quantity\": 1
  }" | jq '.'
echo -e "\n"

# Test 4: Get cart
echo -e "${GREEN}4. Get Shopping Cart${NC}"
CART=$(curl -s -X GET "$BASE_URL/api/v1/cart?userId=$USER_ID")
echo "$CART" | jq '.'
echo -e "\n"

# Extract item ID for deletion test
ITEM_ID=$(echo "$CART" | jq -r '.items[0].id // empty')

# Test 5: Remove item from cart
if [ -n "$ITEM_ID" ]; then
  echo -e "${GREEN}5. Remove Item from Cart${NC}"
  curl -s -X DELETE "$BASE_URL/api/v1/cart/items/$ITEM_ID?userId=$USER_ID" | jq '.'
  echo -e "\n"
fi

# Test 6: Create order
echo -e "${GREEN}6. Create Order${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID_1\",
        \"quantity\": 2
      },
      {
        \"productId\": \"$PRODUCT_ID_2\",
        \"quantity\": 1
      }
    ],
    \"shippingAddress\": {
      \"street\": \"123 Main St\",
      \"city\": \"San Francisco\",
      \"state\": \"CA\",
      \"zipCode\": \"94105\",
      \"country\": \"US\"
    }
  }")
echo "$ORDER_RESPONSE" | jq '.'

# Extract order ID
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id // empty')
echo -e "\nOrder ID: $ORDER_ID\n"

# Test 7: Get specific order
if [ -n "$ORDER_ID" ]; then
  echo -e "${GREEN}7. Get Order Details${NC}"
  curl -s -X GET "$BASE_URL/api/v1/orders/$ORDER_ID" | jq '.'
  echo -e "\n"
fi

# Test 8: List user orders
echo -e "${GREEN}8. List User Orders${NC}"
curl -s -X GET "$BASE_URL/api/v1/orders?userId=$USER_ID&limit=10&offset=0" | jq '.'
echo -e "\n"

# Test 9: Cancel order
if [ -n "$ORDER_ID" ]; then
  echo -e "${GREEN}9. Cancel Order${NC}"
  curl -s -X PUT "$BASE_URL/api/v1/orders/$ORDER_ID/cancel" | jq '.'
  echo -e "\n"
fi

# Test 10: Error handling - Invalid UUID
echo -e "${GREEN}10. Error Handling Test (Invalid UUID)${NC}"
curl -s -X POST "$BASE_URL/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"invalid-uuid\",
    \"productId\": \"$PRODUCT_ID_1\",
    \"quantity\": 1
  }" | jq '.'
echo -e "\n"

# Test 11: Error handling - Invalid quantity
echo -e "${GREEN}11. Error Handling Test (Invalid Quantity)${NC}"
curl -s -X POST "$BASE_URL/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"productId\": \"$PRODUCT_ID_1\",
    \"quantity\": 0
  }" | jq '.'
echo -e "\n"

echo -e "${BLUE}=== Test Suite Complete ===${NC}"
