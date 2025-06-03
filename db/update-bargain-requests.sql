-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bargain_requests' AND column_name = 'status') THEN
        ALTER TABLE bargain_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bargain_requests' AND column_name = 'notes') THEN
        ALTER TABLE bargain_requests ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create index on shop_domain for faster queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'bargain_requests' AND indexname = 'idx_bargain_requests_shop_domain') THEN
        CREATE INDEX idx_bargain_requests_shop_domain ON bargain_requests(shop_domain);
    END IF;
END $$;

-- Create index on status for faster filtering
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'bargain_requests' AND indexname = 'idx_bargain_requests_status') THEN
        CREATE INDEX idx_bargain_requests_status ON bargain_requests(status);
    END IF;
END $$;

-- Create index on created_at for faster sorting
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'bargain_requests' AND indexname = 'idx_bargain_requests_created_at') THEN
        CREATE INDEX idx_bargain_requests_created_at ON bargain_requests(created_at);
    END IF;
END $$;
