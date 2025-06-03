-- Create table for storing archived user data
CREATE TABLE IF NOT EXISTS deleted_users_archive (
  id SERIAL PRIMARY KEY,
  original_user_id INTEGER NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  deletion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT,
  deletion_ip VARCHAR(45),
  
  -- User metadata
  registration_date TIMESTAMP WITH TIME ZONE,
  last_login_date TIMESTAMP WITH TIME ZONE,
  
  -- Membership data
  plan_at_deletion VARCHAR(50),
  subscription_status VARCHAR(50),
  
  -- Usage statistics
  total_products INTEGER DEFAULT 0,
  total_variants INTEGER DEFAULT 0,
  bargaining_enabled_count INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  -- Store data
  had_shopify_connection BOOLEAN DEFAULT FALSE,
  store_url VARCHAR(255),
  
  -- Additional metadata
  user_preferences JSONB,
  user_notifications JSONB,
  
  -- Full data backup (optional)
  complete_data_backup JSONB
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deleted_users_original_id ON deleted_users_archive(original_user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users_archive(email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deletion_date ON deleted_users_archive(deletion_date);

-- Create table for deletion logs
CREATE TABLE IF NOT EXISTS account_deletion_logs (
  id SERIAL PRIMARY KEY,
  original_user_id INTEGER NOT NULL,
  email VARCHAR(255),
  deletion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT,
  deletion_ip VARCHAR(45),
  deletion_status VARCHAR(50) DEFAULT 'completed',
  error_message TEXT
);
