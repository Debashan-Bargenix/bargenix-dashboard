import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Set CORS headers to allow requests from any Shopify store
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 })
  }

  try {
    // Parse the request body
    const body = await request.json()
    const { shop, customerId, customerEmail, customerName, productId, variantId } = body

    // Validate required parameters
    if (!shop || !customerId || !customerEmail || !productId) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400, headers })
    }

    // Create a new customer session
    // In a real implementation, you would store this in a database
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Return the session ID
    return NextResponse.json(
      {
        success: true,
        sessionId,
        message: "Customer session created successfully",
      },
      { headers },
    )
  } catch (error) {
    console.error("Error creating customer session:", error)

    // Don't expose error details in production
    const errorMessage = process.env.NODE_ENV === "development" ? error.message : "Internal server error"

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500, headers })
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    status: 204,
  })
}
