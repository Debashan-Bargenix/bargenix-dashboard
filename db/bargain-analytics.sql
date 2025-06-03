-- Create table for tracking bargaining interactions
CREATE TABLE IF NOT EXISTS bargain_analytics (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  bargaining_enabled BOOLEAN,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional fields for future analytics
  session_id VARCHAR(255),
  customer_id VARCHAR(255),
  offer_amount DECIMAL(10, 2),
  counter_offer_amount DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  bargain_result VARCHAR(50),
  bargain_duration INTEGER,
  device_type VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bargain_analytics_shop ON bargain_analytics(shop_domain);
CREATE INDEX IF NOT EXISTS idx_bargain_analytics_product ON bargain_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_bargain_analytics_action ON bargain_analytics(action);
CREATE INDEX IF NOT EXISTS idx_bargain_analytics_created ON bargain_analytics(created_at);
