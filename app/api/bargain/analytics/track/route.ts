import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"
import crypto from "crypto"

const sql = neon(DATABASE_URL)

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 })
  }

  try {
    const data = await request.json()
    const clientIp = request.headers.get("x-forwarded-for") || "unknown"

    // Validate required fields
    if (!data.shop || !data.productId || !data.eventType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400, headers })
    }

    // Hash the IP address for privacy
    const ipHash = crypto
      .createHash("sha256")
      .update(clientIp + process.env.NEXTAUTH_SECRET || "bargenix-salt")
      .digest("hex")

    // Detect device type
    const userAgent = data.userAgent || request.headers.get("user-agent") || ""
    const deviceType = detectDeviceType(userAgent)

    // Insert analytics data
    const result = await sql`
      INSERT INTO bargain_button_analytics (
        shop_domain,
        product_id,
        variant_id,
        event_type,
        event_timestamp,
        session_id,
        user_agent,
        ip_hash,
        device_type,
        country,
        region,
        city,
        referrer,
        landing_page,
        product_title,
        product_price,
        variant_title,
        bargaining_enabled,
        initial_offer,
        counter_offer,
        final_price,
        discount_percentage,
        negotiation_duration,
        negotiation_steps,
        outcome,
        additional_data
      ) VALUES (
        ${data.shop},
        ${data.productId},
        ${data.variantId || "default"},
        ${data.eventType},
        NOW(),
        ${data.sessionId || null},
        ${userAgent},
        ${ipHash},
        ${deviceType},
        ${data.country || null},
        ${data.region || null},
        ${data.city || null},
        ${data.referrer || null},
        ${data.landingPage || null},
        ${data.productTitle || null},
        ${data.productPrice || null},
        ${data.variantTitle || null},
        ${data.bargainingEnabled !== undefined ? data.bargainingEnabled : null},
        ${data.initialOffer || null},
        ${data.counterOffer || null},
        ${data.finalPrice || null},
        ${data.discountPercentage || null},
        ${data.negotiationDuration || null},
        ${data.negotiationSteps || null},
        ${data.outcome || null},
        ${data.additionalData ? JSON.stringify(data.additionalData) : null}
      )
      RETURNING id
    `

    return NextResponse.json({ success: true, id: result[0]?.id }, { headers })
  } catch (error) {
    console.error("Error tracking bargain button analytics:", error)

    // Don't expose error details in production
    const errorMessage = process.env.NODE_ENV === "development" ? error.message : "Internal server error"

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500, headers })
  }
}

// Helper function to detect device type
function detectDeviceType(userAgent: string): string {
  if (!userAgent) return "unknown"

  const ua = userAgent.toLowerCase()

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
    return "mobile"
  } else if (ua.includes("tablet")) {
    return "tablet"
  } else {
    return "desktop"
  }
}
