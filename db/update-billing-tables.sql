-- Add session_id column to billing_events table
ALTER TABLE billing_events 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Add session_id column to billing_logs table
ALTER TABLE billing_logs 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS billing_events_session_id_idx ON billing_events(session_id);
CREATE INDEX IF NOT EXISTS billing_logs_session_id_idx ON billing_logs(session_id);

-- Add a new table to track billing sessions
CREATE TABLE IF NOT EXISTS billing_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan_id INTEGER,
  shop_domain VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'initiated',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  charge_id VARCHAR(255),
  details JSONB,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL
);
