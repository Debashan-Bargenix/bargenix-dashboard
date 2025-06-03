-- Create table for tracking bargaining interactions
CREATE TABLE IF NOT EXISTS bargain_events (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(255),
  user_agent TEXT,
  referrer TEXT,
  ip_hash VARCHAR(255),
  device_type VARCHAR(50),
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  product_title TEXT,
  product_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Additional data as JSON
  event_data JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bargain_events_shop ON bargain_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_bargain_events_product ON bargain_events(product_id);
CREATE INDEX IF NOT EXISTS idx_bargain_events_type ON bargain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bargain_events_created ON bargain_events(created_at);
