import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(DATABASE_URL)

    // Read the SQL file content
    const sqlScript = `
    -- Check if the bargain_requests table exists, if not create it
    CREATE TABLE IF NOT EXISTS bargain_requests (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      variant_id VARCHAR(255),
      customer_id VARCHAR(255),
      customer_email VARCHAR(255),
      product_title VARCHAR(255),
      product_price DECIMAL(10, 2),
      request_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      user_id INTEGER
    );
    
    -- Add new columns if they don't exist
    DO $$
    BEGIN
      -- Customer information
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'customer_name') THEN
        ALTER TABLE bargain_requests ADD COLUMN customer_name VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'customer_phone') THEN
        ALTER TABLE bargain_requests ADD COLUMN customer_phone VARCHAR(50);
      END IF;
      
      -- Product details
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_handle') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_handle VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_image_url') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_image_url TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_type') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_type VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_vendor') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_vendor VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_tags') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_tags TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'product_collections') THEN
        ALTER TABLE bargain_requests ADD COLUMN product_collections TEXT;
      END IF;
      
      -- Variant details
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'variant_title') THEN
        ALTER TABLE bargain_requests ADD COLUMN variant_title VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'variant_sku') THEN
        ALTER TABLE bargain_requests ADD COLUMN variant_sku VARCHAR(255);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'variant_inventory_quantity') THEN
        ALTER TABLE bargain_requests ADD COLUMN variant_inventory_quantity INTEGER;
      END IF;
      
      -- Analytics data
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'device_type') THEN
        ALTER TABLE bargain_requests ADD COLUMN device_type VARCHAR(50);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'browser') THEN
        ALTER TABLE bargain_requests ADD COLUMN browser VARCHAR(50);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'ip_address') THEN
        ALTER TABLE bargain_requests ADD COLUMN ip_address VARCHAR(50);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'referrer_url') THEN
        ALTER TABLE bargain_requests ADD COLUMN referrer_url TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'session_id') THEN
        ALTER TABLE bargain_requests ADD COLUMN session_id VARCHAR(255);
      END IF;
      
      -- Currency and pricing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'currency_code') THEN
        ALTER TABLE bargain_requests ADD COLUMN currency_code VARCHAR(10) DEFAULT 'USD';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'original_price') THEN
        ALTER TABLE bargain_requests ADD COLUMN original_price DECIMAL(10, 2);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'requested_price') THEN
        ALTER TABLE bargain_requests ADD COLUMN requested_price DECIMAL(10, 2);
      END IF;
      
      -- Timestamps
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'created_at') THEN
        ALTER TABLE bargain_requests ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE bargain_requests ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
      END IF;
      
    END $$;
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_bargain_requests_shop_domain ON bargain_requests(shop_domain);
    CREATE INDEX IF NOT EXISTS idx_bargain_requests_product_id ON bargain_requests(product_id);
    CREATE INDEX IF NOT EXISTS idx_bargain_requests_user_id ON bargain_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_bargain_requests_status ON bargain_requests(status);
    CREATE INDEX IF NOT EXISTS idx_bargain_requests_created_at ON bargain_requests(created_at);
    
    -- Update existing records to link to users based on shop_domain if not already linked
    UPDATE bargain_requests br
    SET user_id = ss.user_id
    FROM shopify_stores ss
    WHERE br.shop_domain = ss.shop_domain
    AND br.user_id IS NULL;
    `

    // Execute the SQL script
    await sql.query(sqlScript)

    return NextResponse.json({
      success: true,
      message: "Bargain requests schema updated successfully",
    })
  } catch (error) {
    console.error("Error updating bargain requests schema:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update bargain requests schema",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
