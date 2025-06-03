import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"

const sql = neon(DATABASE_URL)

export async function GET(request: NextRequest) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 })
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ success: false, error: "Missing shop parameter" }, { status: 400, headers })
    }

    // Check if store exists
    const storeResult = await sql`
      SELECT id, shop_domain, name
      FROM shopify_stores
      WHERE shop_domain = ${shop}
      LIMIT 1
    `

    if (!storeResult || storeResult.length === 0) {
      return NextResponse.json({ success: false, error: "Store not found" }, { status: 404, headers })
    }

    const storeId = storeResult[0].id

    // Get product count
    const productCount = await sql`
      SELECT COUNT(*) as count
      FROM shopify_products
      WHERE store_id = ${storeId}
    `

    // Get bargaining settings count
    const settingsCount = await sql`
      SELECT COUNT(*) as count
      FROM product_bargaining_settings pbs
      JOIN shopify_products p ON pbs.product_id = p.id
      WHERE p.store_id = ${storeId}
    `

    // Get global settings
    const globalSettings = await sql`
      SELECT *
      FROM global_bargaining_settings
      WHERE store_id = ${storeId}
      LIMIT 1
    `

    // Get sample products with bargaining enabled
    const enabledProducts = await sql`
      SELECT 
        p.product_id, 
        p.title, 
        p.price,
        pbs.bargaining_enabled,
        pbs.min_price,
        pbs.behavior
      FROM product_bargaining_settings pbs
      JOIN shopify_products p ON pbs.product_id = p.id
      WHERE p.store_id = ${storeId}
        AND pbs.bargaining_enabled = true
      LIMIT 10
    `

    return NextResponse.json(
      {
        success: true,
        store: storeResult[0],
        productCount: productCount[0]?.count || 0,
        settingsCount: settingsCount[0]?.count || 0,
        globalSettings: globalSettings[0] || null,
        enabledProducts: enabledProducts || [],
        schema: {
          tables: ["shopify_stores", "shopify_products", "product_bargaining_settings", "global_bargaining_settings"],
        },
      },
      { headers },
    )
  } catch (error) {
    console.error("Error in bargaining settings debug:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers })
  }
}
