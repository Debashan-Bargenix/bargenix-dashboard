-- Add original_price column to product_bargaining_settings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_bargaining_settings' 
        AND column_name = 'original_price'
    ) THEN
        ALTER TABLE product_bargaining_settings 
        ADD COLUMN original_price DECIMAL(10, 2);
    END IF;
END
$$;
