import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET() {
  try {
    // Add shopify_domain column to users table if it doesn't exist
    await queryDb(`
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
    `)

    return NextResponse.json({ success: true, message: "Shopify columns added to users table" })
  } catch (error) {
    console.error("Error fixing shopify columns:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
