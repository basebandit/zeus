-- Drop triggers
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;

-- Drop enum type
DROP TYPE IF EXISTS reservation_status;

-- Drop extension (optional - may be used by other services)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
