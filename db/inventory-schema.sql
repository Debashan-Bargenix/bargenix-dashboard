-- Create shopify_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS shopify_products (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL,
  shopify_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  product_type VARCHAR(255),
  vendor VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  variants JSONB,
  images JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, shopify_id)
);

-- Create product_bargaining_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_bargaining_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  bargaining_enabled BOOLEAN NOT NULL DEFAULT false,
  min_price DECIMAL(10, 2) NOT NULL,
  behavior VARCHAR(50) NOT NULL DEFAULT 'normal',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

-- Create user_bargaining_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_bargaining_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  max_products INTEGER NOT NULL DEFAULT 0,
  membership_level VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_products_store_id ON shopify_products(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON shopify_products(status);
CREATE INDEX IF NOT EXISTS idx_product_bargaining_settings_user_id ON product_bargaining_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_product_bargaining_settings_product_id ON product_bargaining_settings(product_id);
