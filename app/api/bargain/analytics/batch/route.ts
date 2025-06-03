import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"

const sql = neon(DATABASE_URL)

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      "Access-Control-Max-Age": "86400",
    },
  })
}

export async function POST(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  }

  try {
    const { events } = await request.json()

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: false, error: "No events provided" }, { status: 400, headers })
    }

    console.log(`analytics-batch: Processing ${events.length} events`)
    // ... (rest of your batch processing logic) ...
    // Ensure product_id/variant_id are handled as GIDs if necessary for your schema

    const processedIds = []
    let failedCount = 0

    for (const event of events) {
      try {
        const result = await sql`
          INSERT INTO bargain_analytics (
            shop_domain, product_id, variant_id, event_type, session_id,
            user_agent, referrer, landing_page, device_type, timestamp,
            customer_id, customer_email, customer_name, is_logged_in,
            product_title, product_price, variant_title, created_at
          ) VALUES (
            ${event.shop_domain}, ${event.product_id}, ${event.variant_id || "default"}, ${event.event_type}, ${event.session_id},
            ${event.user_agent || null}, ${event.referrer || null}, ${event.landing_page || null}, ${event.device_type || null}, ${event.timestamp || new Date().toISOString()},
            ${event.customer_id || null}, ${event.customer_email || null}, ${event.customer_name || null}, ${event.is_logged_in || false},
            ${event.productTitle || null}, ${event.productPrice || null}, ${event.variantTitle || null}, NOW()
          ) RETURNING id
        `
        if (result && result.length > 0) processedIds.push(result[0].id)
      } catch (error) {
        console.error("analytics-batch: Error processing individual event:", error)
        failedCount++
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${processedIds.length} events`,
        ids: processedIds,
        failedCount,
        totalEvents: events.length,
      },
      { headers },
    )
  } catch (error) {
    console.error("analytics-batch: Error processing batch:", error)
    return NextResponse.json({ success: false, error: "Failed to process analytics batch" }, { status: 500, headers })
  }
}
