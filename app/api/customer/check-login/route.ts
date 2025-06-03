import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Set CORS headers to allow requests from any Shopify store
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    // This endpoint is just a placeholder - the actual customer login check
    // happens client-side in the bargain-button.js script by checking
    // the Shopify customer object or making a request to the Shopify customer API

    return NextResponse.json(
      {
        success: true,
        isLoggedIn: false,
        message: "Customer login status check endpoint",
      },
      { headers },
    )
  } catch (error) {
    console.error("Error checking customer login status:", error)

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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    status: 204,
  })
}
