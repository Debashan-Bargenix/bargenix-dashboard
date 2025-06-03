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

    // Only show partial keys for security
    const apiKey = process.env.SHOPIFY_API_KEY || ""
    const apiSecret = process.env.SHOPIFY_API_SECRET || ""
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""

    return NextResponse.json({
      success: true,
      config: {
        apiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "Not set",
        apiSecret: apiSecret
          ? `${apiSecret.substring(0, 4)}...${apiSecret.substring(apiSecret.length - 4)}`
          : "Not set",
        appUrl,
        callbackUrl: `${appUrl}/api/shopify/callback`,
      },
      message:
        "This information helps debug Shopify integration issues. Make sure these values match your Shopify Partner dashboard.",
    })
  } catch (error: any) {
    console.error("Error in debug route:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An error occurred",
      },
      { status: 500 },
    )
  }
}
