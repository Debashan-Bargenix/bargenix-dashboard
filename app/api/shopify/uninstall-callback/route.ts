import { type NextRequest, NextResponse } from "next/server"
import { handleShopifyUninstall } from "@/app/actions/shopify-actions"

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const query: Record<string, string> = {}

  // Convert searchParams to object
  searchParams.forEach((value, key) => {
    query[key] = value
  })

  // Handle uninstall callback
  const result = await handleShopifyUninstall(query)

  if (result.success) {
    // Redirect to Shopify page with success message
    return NextResponse.redirect(
      new URL(
        `/dashboard/shopify?success=true&message=${encodeURIComponent("Store has been disconnected successfully. You can reconnect it anytime.")}`,
        request.url,
      ),
    )
  } else {
    // Redirect to Shopify page with error message
    return NextResponse.redirect(
      new URL(`/dashboard/shopify?error=true&message=${encodeURIComponent(result.message)}`, request.url),
    )
  }
}
