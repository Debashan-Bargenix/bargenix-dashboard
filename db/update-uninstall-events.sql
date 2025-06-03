-- Check if the status column exists in shopify_uninstall_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopify_uninstall_events' 
        AND column_name = 'status'
    ) THEN
        -- Add status column if it doesn't exist
        ALTER TABLE shopify_uninstall_events ADD COLUMN status VARCHAR(50);
    END IF;
END $$;

-- Create index on status column
CREATE INDEX IF NOT EXISTS idx_shopify_uninstall_events_status ON shopify_uninstall_events(status);
