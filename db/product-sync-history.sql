-- Create product_sync_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_sync_history (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  products_synced INTEGER DEFAULT 0,
  variants_synced INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_sync_history_shop_id ON product_sync_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_sync_history_status ON product_sync_history(status);
