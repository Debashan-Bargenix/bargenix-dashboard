import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")
    const redirectUri = searchParams.get("redirect_uri")
    const productId = searchParams.get("product_id")
    const variantId = searchParams.get("variant_id")

    // Validate required parameters
    if (!shop || !redirectUri) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Construct the return URL with bargenix_bargain flag
    let returnUrl = redirectUri
    if (returnUrl.includes("?")) {
      returnUrl += "&bargenix_bargain=true"
    } else {
      returnUrl += "?bargenix_bargain=true"
    }

    // Add product and variant IDs if provided
    if (productId) {
      returnUrl += `&product_id=${encodeURIComponent(productId)}`
    }
    if (variantId) {
      returnUrl += `&variant_id=${encodeURIComponent(variantId)}`
    }

    // Redirect to the Shopify account login page
    const loginUrl = `https://${shop}/account/login?checkout_url=${encodeURIComponent(returnUrl)}`

    // Redirect to the login page
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error("Error in customer auth route:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    status: 204,
  })
}
