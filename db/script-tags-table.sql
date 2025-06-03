-- Table for tracking script tag installations
CREATE TABLE IF NOT EXISTS shopify_script_tags (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  script_tag_id VARCHAR(255) NOT NULL,
  script_type VARCHAR(50) NOT NULL, -- 'bargain_button', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_script_tags_shop ON shopify_script_tags(shop);
