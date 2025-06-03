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
    const data = await request.json()

    if (!data.shop_domain || !data.product_id) {
      console.error("bargain-request: Missing required fields", data)
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400, headers })
    }

    console.log("bargain-request: Received data:", data)

    // ... (rest of your logic for saving the request) ...
    // Ensure you use GID format if saving product_id/variant_id from `data` to your DB

    const storeResult = await sql`
      SELECT user_id FROM shopify_stores 
      WHERE shop_domain = ${data.shop_domain}
      LIMIT 1
    `
    const userId = storeResult.length > 0 ? storeResult[0].user_id : null

    const result = await sql`
      INSERT INTO bargain_requests (
        shop_domain, 
        product_id, 
        variant_id,
        product_title,
        product_price,
        status,
        user_id 
      ) VALUES (
        ${data.shop_domain},
        ${data.product_id}, -- Assuming this is already GID or needs conversion
        ${data.variant_id || null}, -- Assuming this is already GID or needs conversion
        ${(data.product_title || "").replace(/\s+/g, " ").trim()},
        ${data.product_price || null},
        'pending',
        ${userId}
      ) RETURNING id
    `

    console.log("bargain-request: Saved successfully, ID:", result[0]?.id)
    return NextResponse.json(
      { success: true, message: "Bargain request submitted successfully", requestId: result[0].id },
      { headers },
    )
  } catch (error) {
    console.error("bargain-request: Error submitting request:", error)
    return NextResponse.json({ success: false, message: "Failed to submit bargain request" }, { status: 500, headers })
  }
}
