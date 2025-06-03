-- Create table for product bargaining settings
CREATE TABLE IF NOT EXISTS product_bargaining_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255) NOT NULL,
  bargaining_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  min_price DECIMAL(10, 2) NOT NULL,
  behavior VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_bargaining_user_product ON product_bargaining_settings(user_id, product_id);

-- Create table for user bargaining limits (based on membership)
CREATE TABLE IF NOT EXISTS user_bargaining_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_products INTEGER NOT NULL DEFAULT 0,
  membership_level VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Insert some sample data for testing
INSERT INTO user_bargaining_limits (user_id, max_products, membership_level)
VALUES 
  (1, 5, 'basic'),
  (2, 20, 'premium'),
  (3, 50, 'professional')
ON CONFLICT (user_id) DO UPDATE 
SET max_products = EXCLUDED.max_products,
    membership_level = EXCLUDED.membership_level,
    updated_at = NOW();
