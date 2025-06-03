import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    // Get current user to verify authentication
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    // Get environment variables
    const apiKey = process.env.SHOPIFY_API_KEY || ""
    const apiSecret = process.env.SHOPIFY_API_SECRET || ""
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const scopes = process.env.SHOPIFY_SCOPES || "read_products,read_shop" // Default fallback

    // Format the callback URL
    const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl
    const callbackUrl = `${baseUrl}/api/shopify/callback`

    return NextResponse.json({
      success: true,
      config: {
        apiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "Not set",
        apiSecret: apiSecret
          ? `${apiSecret.substring(0, 4)}...${apiSecret.substring(apiSecret.length - 4)}`
          : "Not set",
        appUrl,
        callbackUrl,
        scopes,
        scopesList: scopes.split(","),
      },
      message:
        "This information helps debug Shopify integration issues. Make sure these values match your Shopify Partner dashboard.",
    })
  } catch (error: any) {
    console.error("Error in env check route:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An error occurred",
      },
      { status: 500 },
    )
  }
}
