-- Drop the old tables if they exist (cleanup)
DROP TABLE IF EXISTS chatbot_script_installations;
DROP TABLE IF EXISTS chatbot_widget_settings;
DROP TABLE IF EXISTS chatbot_behavior_settings;
DROP TABLE IF EXISTS chatbot_interactions;

-- Create a simple table for tracking bargain button installations
CREATE TABLE IF NOT EXISTS bargain_button_installations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  script_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bargain_button_shop ON bargain_button_installations(shop_domain);
CREATE INDEX IF NOT EXISTS idx_bargain_button_user ON bargain_button_installations(user_id);
