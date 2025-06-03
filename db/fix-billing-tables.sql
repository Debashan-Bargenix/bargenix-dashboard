-- Check if billing_events table exists and create it if it doesn't
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
  session_id VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL
);

-- Check if billing_logs table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS billing_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255),
  log_type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_details JSONB,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add billing-related fields to user_memberships if they don't exist
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS billing_details JSONB;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS shopify_charge_id VARCHAR(255);

-- Add session_id column to user_memberships if it doesn't exist
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Add index on shopify_charge_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_memberships_shopify_charge_id ON user_memberships(shopify_charge_id);

-- Add index on user_id and status for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id_status ON user_memberships(user_id, status);

-- Check for and fix any pending memberships that are stuck
UPDATE user_memberships
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours';

-- Check for any duplicate active memberships for the same user
WITH duplicate_actives AS (
  SELECT user_id, COUNT(*) as active_count
  FROM user_memberships
  WHERE status = 'active'
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
UPDATE user_memberships um
SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
FROM duplicate_actives da
WHERE um.user_id = da.user_id
AND um.status = 'active'
AND um.id NOT IN (
  SELECT id FROM user_memberships
  WHERE user_id = da.user_id
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
);
