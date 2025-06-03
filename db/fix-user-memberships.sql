-- Add a unique constraint to user_memberships table for the ON CONFLICT clause to work
ALTER TABLE user_memberships 
ADD CONSTRAINT user_memberships_user_id_plan_id_status_unique 
UNIQUE (user_id, plan_id, status);

-- Make sure we have the shopify_charge_id column
ALTER TABLE user_memberships 
ADD COLUMN IF NOT EXISTS shopify_charge_id VARCHAR(255);

-- Add billing_status and billing_details columns if they don't exist
ALTER TABLE user_memberships 
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_details JSONB;
