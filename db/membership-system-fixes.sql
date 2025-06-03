-- Create a function to ensure each user has only one active membership
CREATE OR REPLACE FUNCTION ensure_single_active_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're inserting or updating to 'active' status
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    
    -- Cancel any existing active memberships for this user
    UPDATE user_memberships
    SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS ensure_single_active_membership_trigger ON user_memberships;

-- Create the trigger
CREATE TRIGGER ensure_single_active_membership_trigger
BEFORE INSERT OR UPDATE ON user_memberships
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_membership();

-- Create an index to enforce the constraint
DROP INDEX IF EXISTS idx_user_memberships_active_user;
CREATE UNIQUE INDEX idx_user_memberships_active_user 
ON user_memberships (user_id) 
WHERE status = 'active';

-- Fix any existing issues with multiple active memberships
DO $$
DECLARE
  user_with_multiple_active RECORD;
  latest_membership_id INTEGER;
BEGIN
  -- Find users with multiple active memberships
  FOR user_with_multiple_active IN
    SELECT user_id, COUNT(*) as active_count
    FROM user_memberships
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get the most recent active membership for this user
    SELECT id INTO latest_membership_id
    FROM user_memberships
    WHERE user_id = user_with_multiple_active.user_id AND status = 'active'
    ORDER BY start_date DESC, id DESC
    LIMIT 1;
    
    -- Cancel all other active memberships
    UPDATE user_memberships
    SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
    WHERE user_id = user_with_multiple_active.user_id 
      AND status = 'active'
      AND id != latest_membership_id;
      
    RAISE NOTICE 'Fixed user % with % active memberships. Kept membership ID %',
      user_with_multiple_active.user_id, 
      user_with_multiple_active.active_count,
      latest_membership_id;
  END LOOP;
END $$;

-- Fix any stuck pending memberships older than 24 hours
UPDATE user_memberships
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending'
AND start_date < NOW() - INTERVAL '24 hours';
