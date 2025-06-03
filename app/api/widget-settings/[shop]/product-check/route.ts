import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { shop: string } }) {
  try {
    const shop = params.shop
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId") || "default"

    if (!shop || !productId) {
      return NextResponse.json({ error: "Shop and productId parameters are required" }, { status: 400 })
    }

    console.log(`Checking bargaining status for shop: ${shop}, product: ${productId}, variant: ${variantId}`)

    // Get the user ID for this shop
    const shopQuery = `
      SELECT user_id 
      FROM shopify_stores 
      WHERE shop_domain = $1 AND status = 'active'
      LIMIT 1
    `
    const shopResult = await queryDb(shopQuery, [shop])

    if (shopResult.length === 0) {
      console.log(`Shop not found: ${shop}`)
      return NextResponse.json(
        { bargainingEnabled: false, message: "Shop not found" },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      )
    }

    const userId = shopResult[0].user_id

    // Check if bargaining is enabled for this product/variant
    const bargainingQuery = `
      SELECT bargaining_enabled, min_price, original_price, behavior
      FROM product_bargaining_settings
      WHERE user_id = $1 AND product_id = $2 AND variant_id = $3
      LIMIT 1
    `
    const bargainingResult = await queryDb(bargainingQuery, [userId, productId, variantId])

    // If no specific variant setting, check for default product setting
    if (bargainingResult.length === 0 && variantId !== "default") {
      const defaultQuery = `
        SELECT bargaining_enabled, min_price, original_price, behavior
        FROM product_bargaining_settings
        WHERE user_id = $1 AND product_id = $2 AND variant_id = 'default'
        LIMIT 1
      `
      const defaultResult = await queryDb(defaultQuery, [userId, productId])

      if (defaultResult.length > 0) {
        return NextResponse.json(
          {
            bargainingEnabled: defaultResult[0].bargaining_enabled,
            minPrice: defaultResult[0].min_price,
            originalPrice: defaultResult[0].original_price,
            behavior: defaultResult[0].behavior,
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          },
        )
      }
    }

    // Return the result
    if (bargainingResult.length > 0) {
      return NextResponse.json(
        {
          bargainingEnabled: bargainingResult[0].bargaining_enabled,
          minPrice: bargainingResult[0].min_price,
          originalPrice: bargainingResult[0].original_price,
          behavior: bargainingResult[0].behavior,
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      )
    }

    // Default response if no settings found
    return NextResponse.json(
      { bargainingEnabled: false, message: "No bargaining settings found for this product" },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("Error checking product bargaining status:", error)
    return NextResponse.json({ error: `Failed to check bargaining status: ${error.message}` }, { status: 500 })
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
