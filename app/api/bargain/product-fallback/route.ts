import { type NextRequest, NextResponse } from "next/server"

// Make sure this is a public route - no authentication required
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId") || "default"
    const productTitle = searchParams.get("title") || "Product"
    const productPrice = searchParams.get("price") || "0.00"
    const productImage = searchParams.get("image") || null

    if (!shop || !productId) {
      return NextResponse.json({ error: "Shop and productId parameters are required" }, { status: 400 })
    }

    console.log(`Fallback for product: ${productId} at ${shop}`)

    // For fallback, we'll check global settings only
    // In a real implementation, you might want to fetch this from the database
    // For now, we'll just return a default response

    return NextResponse.json(
      {
        bargainingEnabled: false,
        minPrice: 0,
        originalPrice: productPrice,
        behavior: "default",
        productTitle,
        productPrice,
        productImage,
        isGlobalSetting: true,
        isFallback: true,
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
  } catch (error) {
    console.error("Error in product fallback:", error)

    return NextResponse.json(
      {
        bargainingEnabled: false,
        error: "Failed to process fallback request",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
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
