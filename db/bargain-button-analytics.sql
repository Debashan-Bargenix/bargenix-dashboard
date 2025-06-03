-- Create table for tracking bargain button interactions
CREATE TABLE IF NOT EXISTS bargain_button_analytics (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255) NOT NULL,
  
  -- Event information
  event_type VARCHAR(50) NOT NULL, -- 'button_click', 'chatbot_open', 'chat_started', 'bargain_completed', etc.
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User information (anonymized)
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_hash VARCHAR(64), -- Hashed IP for privacy
  device_type VARCHAR(50),
  
  -- Location data (if available)
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Referrer information
  referrer TEXT,
  landing_page TEXT,
  
  -- Product information
  product_title VARCHAR(255),
  product_price DECIMAL(10, 2),
  variant_title VARCHAR(255),
  
  -- Bargaining information
  bargaining_enabled BOOLEAN,
  initial_offer DECIMAL(10, 2),
  counter_offer DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2),
  negotiation_duration INTEGER, -- in seconds
  negotiation_steps INTEGER,
  
  -- Outcome
  outcome VARCHAR(50), -- 'purchased', 'abandoned', 'rejected', etc.
  
  -- Additional data
  additional_data JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bargain_button_shop ON bargain_button_analytics(shop_domain);
CREATE INDEX IF NOT EXISTS idx_bargain_button_product ON bargain_button_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_bargain_button_event ON bargain_button_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_bargain_button_timestamp ON bargain_button_analytics(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_bargain_button_outcome ON bargain_button_analytics(outcome);
