import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getShopifyStoreByUserId } from "@/app/actions/shopify-actions"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const store = await getShopifyStoreByUserId(user.id)

    if (!store) {
      return NextResponse.json({ success: false, message: "No store connected" }, { status: 404 })
    }

    // Return only the necessary store data
    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        shop_domain: store.shop_domain,
        shop_name: store.shop_name,
        currency: store.currency,
        status: store.status,
        access_token: store.access_token ? true : false, // Just indicate if token exists, don't send actual token
      },
    })
  } catch (error) {
    console.error("Error in store data API:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 },
    )
  }
}
