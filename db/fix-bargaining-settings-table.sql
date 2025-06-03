-- Check if product_bargaining_settings table exists and create it if not
CREATE TABLE IF NOT EXISTS product_bargaining_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  bargaining_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  min_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,  -- Added original_price column
  behavior VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_bargaining_settings_user_product_variant_key'
  ) THEN
    ALTER TABLE product_bargaining_settings 
    ADD CONSTRAINT product_bargaining_settings_user_product_variant_key 
    UNIQUE (user_id, product_id, variant_id);
  END IF;
END
$$;

-- Add original_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_bargaining_settings' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE product_bargaining_settings 
    ADD COLUMN original_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- Create index for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_product_bargaining_user_product 
ON product_bargaining_settings(user_id, product_id);

-- Create index for variant lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_product_bargaining_variant 
ON product_bargaining_settings(variant_id);

-- Create index for enabled products if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_product_bargaining_enabled 
ON product_bargaining_settings(user_id, bargaining_enabled);
