-- Create table for customer bargain sessions
CREATE TABLE IF NOT EXISTS customer_bargain_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  shop_domain VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_bargain_sessions_customer_id ON customer_bargain_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_bargain_sessions_shop_domain ON customer_bargain_sessions(shop_domain);
CREATE INDEX IF NOT EXISTS idx_customer_bargain_sessions_product_id ON customer_bargain_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_bargain_sessions_session_id ON customer_bargain_sessions(session_id);
