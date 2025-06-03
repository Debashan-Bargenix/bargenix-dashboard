-- Create bargain_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS bargain_requests (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  product_title VARCHAR(255),
  product_price DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on shop_domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_bargain_requests_shop_domain ON bargain_requests(shop_domain);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_bargain_requests_status ON bargain_requests(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_bargain_requests_created_at ON bargain_requests(created_at);

-- Insert some test data if the table is empty
INSERT INTO bargain_requests (
  shop_domain, 
  product_id, 
  variant_id, 
  customer_email, 
  product_title, 
  product_price, 
  status, 
  created_at, 
  updated_at
)
SELECT 
  (SELECT shop_domain FROM shopify_stores WHERE status = 'active' LIMIT 1),
  'gid://shopify/Product/123456789',
  'gid://shopify/ProductVariant/987654321',
  'customer@example.com',
  'Sample Product',
  99.99,
  'pending',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM bargain_requests LIMIT 1);

-- Insert a few more test records with different statuses
INSERT INTO bargain_requests (
  shop_domain, 
  product_id, 
  variant_id, 
  customer_email, 
  product_title, 
  product_price, 
  status, 
  created_at, 
  updated_at
)
SELECT 
  (SELECT shop_domain FROM shopify_stores WHERE status = 'active' LIMIT 1),
  'gid://shopify/Product/223456789',
  'gid://shopify/ProductVariant/887654321',
  'customer2@example.com',
  'Another Product',
  149.99,
  'approved',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '12 hours'
WHERE EXISTS (SELECT 1 FROM shopify_stores WHERE status = 'active' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM bargain_requests WHERE status = 'approved' LIMIT 1);

INSERT INTO bargain_requests (
  shop_domain, 
  product_id, 
  variant_id, 
  customer_email, 
  product_title, 
  product_price, 
  status, 
  created_at, 
  updated_at
)
SELECT 
  (SELECT shop_domain FROM shopify_stores WHERE status = 'active' LIMIT 1),
  'gid://shopify/Product/323456789',
  'gid://shopify/ProductVariant/787654321',
  'customer3@example.com',
  'Third Product',
  199.99,
  'rejected',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days'
WHERE EXISTS (SELECT 1 FROM shopify_stores WHERE status = 'active' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM bargain_requests WHERE status = 'rejected' LIMIT 1);

INSERT INTO bargain_requests (
  shop_domain, 
  product_id, 
  variant_id, 
  customer_email, 
  product_title, 
  product_price, 
  status, 
  created_at, 
  updated_at
)
SELECT 
  (SELECT shop_domain FROM shopify_stores WHERE status = 'active' LIMIT 1),
  'gid://shopify/Product/423456789',
  'gid://shopify/ProductVariant/687654321',
  'customer4@example.com',
  'Fourth Product',
  299.99,
  'completed',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM shopify_stores WHERE status = 'active' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM bargain_requests WHERE status = 'completed' LIMIT 1);
