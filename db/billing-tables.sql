-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  charge_id VARCHAR(255),
  plan_id INTEGER,
  plan_slug VARCHAR(50),
  amount DECIMAL(10, 2),
  status VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL
);

-- Create billing_logs table for API call logging
CREATE TABLE IF NOT EXISTS billing_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255),
  log_type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add billing-related fields to user_memberships if they don't exist
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS billing_details JSONB;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
