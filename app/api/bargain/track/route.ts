import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.shop || !data.productId || !data.action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert tracking data
    const query = `
      INSERT INTO bargain_analytics (
        shop_domain,
        product_id,
        variant_id,
        action,
        bargaining_enabled,
        user_agent,
        referrer,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )
      RETURNING id
    `

    const params = [
      data.shop,
      data.productId,
      data.variantId || "default",
      data.action,
      data.bargainingEnabled !== undefined ? data.bargainingEnabled : null,
      data.userAgent || null,
      data.referrer || null,
    ]

    const result = await queryDb(query, params)

    return NextResponse.json(
      { success: true, id: result[0]?.id },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  } catch (error) {
    console.error("Error tracking bargain action:", error)

    // Don't fail the client request for tracking errors
    return NextResponse.json(
      { success: false, error: "Failed to track action" },
      {
        status: 200, // Return 200 even on error to not disrupt user experience
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
