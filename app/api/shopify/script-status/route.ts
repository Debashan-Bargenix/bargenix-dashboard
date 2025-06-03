import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's connected store
    const storeResult = await queryDb(
      `SELECT shop_domain, created_at, updated_at FROM shopify_stores WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [user.id],
    )

    if (storeResult.length === 0) {
      return NextResponse.json({ error: "No connected Shopify store found" }, { status: 404 })
    }

    const store = storeResult[0]

    // For now, assume script is installed if store is connected
    // In a real implementation, you would check the actual script installation status
    return NextResponse.json({
      data: {
        installed: true, // Assume installed if store is connected
        lastInstalled: store.updated_at || store.created_at,
        storeConnected: true,
        lastSync: store.updated_at,
      },
    })
  } catch (error) {
    console.error("Error fetching script status:", error)
    return NextResponse.json({ error: "Failed to fetch script status" }, { status: 500 })
  }
}
