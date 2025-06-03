-- Create table for button customization settings
CREATE TABLE IF NOT EXISTS bargain_button_customizations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  button_text VARCHAR(255) DEFAULT 'Bargain a Deal',
  button_position VARCHAR(50) DEFAULT 'after-buy-button',
  button_color VARCHAR(50) DEFAULT '#4F46E5',
  text_color VARCHAR(50) DEFAULT '#FFFFFF',
  border_radius VARCHAR(20) DEFAULT '8px',
  font_size VARCHAR(20) DEFAULT '14px',
  padding VARCHAR(50) DEFAULT '10px 15px',
  smart_mode BOOLEAN DEFAULT TRUE,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);
