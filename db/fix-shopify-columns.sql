-- Add shopify_domain column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'shopify_domain') THEN
    ALTER TABLE users ADD COLUMN shopify_domain VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'shopify_access_token') THEN
    ALTER TABLE users ADD COLUMN shopify_access_token VARCHAR(255);
  END IF;
END
$$;
