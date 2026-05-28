#!/usr/bin/env bash
# Seed a varied demo catalog (20 items, with related images) into the Inventory service.
# Posts directly to the inventory API (no auth) and adds stock for each product.
#
# Images use keyword-based URLs (loremflickr) so each photo relates to the product
# and never 404s; the web UI falls back to picsum if the image service is unreachable.
#
# Usage:  ./seed-products.sh            # defaults to http://localhost:8082
#         INVENTORY_URL=http://host:8082 ./seed-products.sh
set -euo pipefail

INVENTORY_URL="${INVENTORY_URL:-http://localhost:8082}"
STOCK="${STOCK:-100}"
IMG="https://loremflickr.com/600/450"

# id|name|description|price|category|image-keywords
PRODUCTS=(
  "11111111-1111-4111-8111-111111111111|Aurora Wireless Headphones|Over-ear noise-cancelling headphones with 30-hour battery life.|199.99|Audio|headphones"
  "22222222-2222-4222-8222-222222222222|Trailblazer Running Shoes|Lightweight cushioned runners built for daily miles.|129.99|Footwear|running,shoes"
  "33333333-3333-4333-8333-333333333333|Click MX Mechanical Keyboard|Hot-swappable keyboard with tactile brown switches.|89.99|Electronics|mechanical,keyboard"
  "44444444-4444-4444-8444-444444444444|Pulse Smart Watch|Fitness and heart-rate tracking with a vivid AMOLED display.|149.99|Wearables|smartwatch"
  "55555555-5555-4555-8555-555555555555|Wanderer Leather Backpack|Full-grain leather backpack with a padded laptop sleeve.|159.99|Accessories|leather,backpack"
  "66666666-6666-4666-8666-666666666666|Lumen Mirrorless Camera|24MP mirrorless camera with a fast 18-55mm kit lens.|749.99|Photography|camera"
  "77777777-7777-4777-8777-777777777777|Horizon Polarized Sunglasses|UV400 polarized lenses in a lightweight acetate frame.|59.99|Accessories|sunglasses"
  "88888888-8888-4888-8888-888888888888|Daybreak Ceramic Mug|Hand-glazed 12oz stoneware mug, microwave safe.|18.99|Home|coffee,mug"
  "99999999-9999-4999-8999-999999999999|Halo LED Desk Lamp|Dimmable desk lamp with adjustable colour temperature.|44.99|Home|desk,lamp"
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa|Stride Court Sneakers|Retro court sneakers with a cushioned leather upper.|99.99|Footwear|sneakers"
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb|Apex Wireless Mouse|Ergonomic 6-button wireless mouse with silent clicks.|39.99|Electronics|computer,mouse"
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc|Nimbus Portable Speaker|Waterproof Bluetooth speaker with deep bass and 18h playtime.|79.99|Audio|bluetooth,speaker"
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd|Cumulus Office Chair|Breathable mesh ergonomic chair with lumbar support.|229.99|Furniture|office,chair"
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee|Summit Insulated Bottle|Vacuum-insulated steel bottle keeps drinks cold 24h.|29.99|Outdoor|water,bottle"
  "ffffffff-ffff-4fff-8fff-ffffffffffff|Echo Smart Speaker|Voice assistant speaker with room-filling sound.|99.99|Smart Home|smart,speaker"
  "12121212-1212-4121-8121-121212121212|Drift Maple Skateboard|7-ply maple complete skateboard with smooth bearings.|119.99|Outdoor|skateboard"
  "23232323-2323-4232-8232-232323232323|Forge Cast Iron Skillet|Pre-seasoned 12-inch cast iron skillet for any stovetop.|49.99|Kitchen|skillet,pan"
  "34343434-3434-4343-8343-343434343434|Ember Scented Candle|Hand-poured soy candle with warm amber and cedar notes.|24.99|Home|candle"
  "45454545-4545-4454-8454-454545454545|Heritage Analog Watch|Minimalist analog watch with a genuine leather strap.|189.99|Wearables|wristwatch"
  "56565656-5656-4565-8565-565656565656|Zen Cork Yoga Mat|Non-slip natural cork yoga mat with alignment lines.|54.99|Fitness|yoga,mat"
)

echo "Seeding ${#PRODUCTS[@]} products into $INVENTORY_URL ..."
i=0
for row in "${PRODUCTS[@]}"; do
  i=$((i + 1))
  IFS='|' read -r id name desc price category keywords <<<"$row"
  sku=$(printf 'ZEUS-%03d' "$i")
  image="$IMG/$keywords?lock=$i"

  curl -s -o /dev/null -w "  [%{http_code}] create $name\n" \
    -X POST "$INVENTORY_URL/api/v1/products" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg id "$id" --arg name "$name" --arg desc "$desc" \
              --argjson price "$price" --arg sku "$sku" --arg category "$category" \
              --arg image "$image" \
              '{id:$id,name:$name,description:$desc,price:$price,currency:"USD",sku:$sku,category:$category,imageUrl:$image}')"

  curl -s -o /dev/null -w "  [%{http_code}] stock +$STOCK\n" \
    -X POST "$INVENTORY_URL/api/v1/inventory/$id/add-stock" -H 'Content-Type: application/json' \
    -d "{\"quantity\": $STOCK}"
done

echo "Done. Seeded ${#PRODUCTS[@]} products."
