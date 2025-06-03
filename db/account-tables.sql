-- Check if user_activity table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if user_notifications table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  security_alerts BOOLEAN DEFAULT TRUE,
  product_updates BOOLEAN DEFAULT TRUE,
  account_activity BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Check if user_preferences table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'system',
  language VARCHAR(10) DEFAULT 'en',
  auto_save BOOLEAN DEFAULT TRUE,
  compact_view BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Check if deleted_users_archive table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS deleted_users_archive (
  id SERIAL PRIMARY KEY,
  original_user_id INTEGER NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  user_data JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users_archive(email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at ON deleted_users_archive(deleted_at);

-- Add default data for existing users
INSERT INTO user_notifications (user_id, email_notifications, marketing_emails, security_alerts, product_updates, account_activity)
SELECT id, TRUE, FALSE, TRUE, TRUE, TRUE
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_notifications WHERE user_notifications.user_id = users.id
);

INSERT INTO user_preferences (user_id, theme, language, auto_save, compact_view)
SELECT id, 'system', 'en', TRUE, FALSE
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_preferences WHERE user_preferences.user_id = users.id
);
