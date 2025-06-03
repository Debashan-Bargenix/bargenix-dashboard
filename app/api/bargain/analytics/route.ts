import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

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

    // Get analytics data
    // For now, we'll return placeholder data since the full analytics implementation will come later

    // Check if the analytics table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_analytics'
      );
    `)

    if (!tableCheck[0].exists) {
      // Table doesn't exist yet, return empty data
      return NextResponse.json({
        success: true,
        analytics: {
          totalClicks: 0,
          totalViews: 0,
          conversionRate: 0,
          topProducts: [],
          recentInteractions: [],
        },
      })
    }

    // Get button clicks count
    const clicksQuery = `
      SELECT COUNT(*) as count
      FROM bargain_analytics
      WHERE shop_domain = $1 AND action = 'button_click'
    `
    const clicksResult = await queryDb(clicksQuery, [shop])
    const totalClicks = Number.parseInt(clicksResult[0]?.count || "0")

    // Get chatbot views count
    const viewsQuery = `
      SELECT COUNT(*) as count
      FROM bargain_analytics
      WHERE shop_domain = $1 AND action = 'chatbot_view'
    `
    const viewsResult = await queryDb(viewsQuery, [shop])
    const totalViews = Number.parseInt(viewsResult[0]?.count || "0")

    // Calculate conversion rate
    const conversionRate = totalClicks > 0 ? (totalViews / totalClicks) * 100 : 0

    // Get top products
    const topProductsQuery = `
      SELECT 
        product_id,
        COUNT(*) as interaction_count
      FROM bargain_analytics
      WHERE shop_domain = $1
      GROUP BY product_id
      ORDER BY interaction_count DESC
      LIMIT 5
    `
    const topProducts = await queryDb(topProductsQuery, [shop])

    // Get recent interactions
    const recentInteractionsQuery = `
      SELECT *
      FROM bargain_analytics
      WHERE shop_domain = $1
      ORDER BY created_at DESC
      LIMIT 10
    `
    const recentInteractions = await queryDb(recentInteractionsQuery, [shop])

    return NextResponse.json({
      success: true,
      analytics: {
        totalClicks,
        totalViews,
        conversionRate: Number.parseFloat(conversionRate.toFixed(2)),
        topProducts,
        recentInteractions,
      },
    })
  } catch (error) {
    console.error("Error fetching bargaining analytics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bargaining analytics",
      },
      { status: 500 },
    )
  }
}
