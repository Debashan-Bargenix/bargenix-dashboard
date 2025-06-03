import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get all connected stores
    const stores = await queryDb(
      `
      SELECT s.*, t.access_token IS NOT NULL as has_token
      FROM shopify_stores s
      LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.user_id = $1
      ORDER BY s.status = 'active' DESC, s.updated_at DESC
    `,
      [user.id],
    )

    // Get active store
    const activeStore = stores.find((store: any) => store.status === "active" && store.has_token)

    if (!activeStore) {
      return NextResponse.json({ error: "No active store found" }, { status: 404 })
    }

    // Get access token
    const tokenResult = await queryDb(
      `
      SELECT access_token FROM shopify_auth_tokens
      WHERE store_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [activeStore.id],
    )

    if (tokenResult.length === 0) {
      return NextResponse.json({ error: "No access token found" }, { status: 404 })
    }

    const accessToken = tokenResult[0].access_token

    // Test the connection by fetching shop details
    const response = await fetch(`https://${activeStore.shop_domain}/admin/api/2023-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json(
        { error: "Failed to connect to Shopify", status: response.status, details: errorData },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      store: activeStore,
      shopDetails: data.shop,
      connection: {
        status: "connected",
        statusCode: response.status,
      },
    })
  } catch (error: any) {
    console.error("Error testing Shopify connection:", error)
    return NextResponse.json({ error: "Failed to test Shopify connection", message: error.message }, { status: 500 })
  }
}
