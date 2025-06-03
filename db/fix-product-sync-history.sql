-- Drop and recreate product_sync_history table with proper structure
DROP TABLE IF EXISTS product_sync_history;

CREATE TABLE product_sync_history (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  products_synced INTEGER DEFAULT 0,
  variants_synced INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_product_sync_history_shop_id ON product_sync_history(shop_id);
CREATE INDEX idx_product_sync_history_status ON product_sync_history(status);
CREATE INDEX idx_product_sync_history_started_at ON product_sync_history(started_at);
