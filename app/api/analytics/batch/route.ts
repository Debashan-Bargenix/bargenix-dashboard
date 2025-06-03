import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: false, error: "No events provided" }, { status: 400 })
    }

    // Check if the table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_events'
      );
    `)

    if (!tableCheck[0].exists) {
      // Create the table if it doesn't exist
      await queryDb(`
        CREATE TABLE IF NOT EXISTS bargain_events (
          id SERIAL PRIMARY KEY,
          shop_domain VARCHAR(255) NOT NULL,
          product_id VARCHAR(255) NOT NULL,
          variant_id VARCHAR(255),
          event_type VARCHAR(50) NOT NULL,
          session_id VARCHAR(255),
          user_agent TEXT,
          referrer TEXT,
          landing_page TEXT,
          product_title TEXT,
          product_price VARCHAR(50),
          variant_title TEXT,
          device_type VARCHAR(50),
          country VARCHAR(100),
          city VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_bargain_events_shop ON bargain_events(shop_domain);
        CREATE INDEX IF NOT EXISTS idx_bargain_events_product ON bargain_events(product_id);
        CREATE INDEX IF NOT EXISTS idx_bargain_events_event_type ON bargain_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_bargain_events_created ON bargain_events(created_at);
      `)
    }

    // Process events in batches
    const batchSize = 50
    const results = []

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      const values = []
      const placeholders = []

      batch.forEach((event, index) => {
        const offset = index * 13
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`,
        )
        values.push(
          event.shop,
          event.productId,
          event.variantId || "default",
          event.eventType,
          event.sessionId || null,
          event.userAgent || null,
          event.referrer || null,
          event.landingPage || null,
          event.productTitle || null,
          event.productPrice || null,
          event.variantTitle || null,
          event.deviceType || null,
          event.country || null,
        )
      })

      const query = `
        INSERT INTO bargain_events (
          shop_domain,
          product_id,
          variant_id,
          event_type,
          session_id,
          user_agent,
          referrer,
          landing_page,
          product_title,
          product_price,
          variant_title,
          device_type,
          country
        ) VALUES ${placeholders.join(", ")}
        RETURNING id
      `

      const result = await queryDb(query, values)
      results.push(...result)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${events.length} events`,
      ids: results.map((r) => r.id),
    })
  } catch (error) {
    console.error("Error processing analytics batch:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process analytics batch",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
