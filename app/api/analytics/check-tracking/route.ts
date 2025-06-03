import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { subHours } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    // Verify the shop belongs to the current user
    const shopQuery = `
      SELECT id FROM shopify_stores
      WHERE shop_domain = $1 AND user_id = $2
    `
    const shopResult = await queryDb(shopQuery, [shop, user.id])

    if (shopResult.length === 0) {
      return NextResponse.json({ success: false, error: "Shop not found or not authorized" }, { status: 403 })
    }

    // Check if the bargain_events table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_events'
      );
    `)

    if (!tableCheck[0].exists) {
      return NextResponse.json({
        success: true,
        status: "unknown",
        message: "Analytics table not yet created",
      })
    }

    // Check for recent events (last 24 hours)
    const recentTime = subHours(new Date(), 24)
    const recentEventsQuery = `
      SELECT COUNT(*) as count
      FROM bargain_events
      WHERE shop_domain = $1
      AND created_at > $2
    `
    const recentEvents = await queryDb(recentEventsQuery, [shop, recentTime])

    // Check for button_view events specifically
    const buttonViewQuery = `
      SELECT COUNT(*) as count
      FROM bargain_events
      WHERE shop_domain = $1
      AND event_type = 'button_view'
    `
    const buttonViews = await queryDb(buttonViewQuery, [shop])

    // Determine tracking status
    let status = "unknown"
    let message = "Unable to determine tracking status"

    if (Number(recentEvents[0].count) > 0) {
      status = "ok"
      message = "Tracking is working properly"
    } else if (Number(buttonViews[0].count) > 0) {
      status = "ok"
      message = "Tracking has worked in the past but no recent events"
    } else {
      status = "issues"
      message = "No tracking events detected"
    }

    return NextResponse.json({
      success: true,
      status,
      message,
      data: {
        recentEvents: Number(recentEvents[0].count),
        totalButtonViews: Number(buttonViews[0].count),
      },
    })
  } catch (error) {
    console.error("Error checking tracking status:", error)
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: "Failed to check tracking status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
