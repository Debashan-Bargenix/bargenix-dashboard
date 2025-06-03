import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get("timeframe") || "week"
    const shopDomain = searchParams.get("shop") || ""

    // If shop domain is provided, use it; otherwise get user's connected store
    let storeResult
    if (!shopDomain) {
      storeResult = await queryDb(
        `SELECT shop_domain FROM shopify_stores WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [user.id],
      )

      if (storeResult.length === 0) {
        return NextResponse.json({ error: "No connected Shopify store found" }, { status: 404 })
      }
    }

    const activeDomain = shopDomain || storeResult[0].shop_domain

    // Determine date range
    let interval: string
    switch (timeframe) {
      case "month":
        interval = "30 days"
        break
      case "quarter":
        interval = "90 days"
        break
      case "day":
        interval = "24 hours"
        break
      case "week":
      default:
        interval = "7 days"
        break
    }

    // Check if bargain_button_analytics table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_button_analytics'
      );
    `)

    if (!tableExists[0]?.exists) {
      return NextResponse.json(
        {
          error: "Analytics table does not exist",
          message: "The analytics tracking system is not properly set up.",
        },
        { status: 500 },
      )
    }

    // Get KPI summary data
    const kpiData = await queryDb(
      `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        SUM(CASE WHEN event_type = 'button_click' THEN 1 ELSE 0 END) as button_clicks,
        SUM(CASE WHEN event_type = 'chatbot_open' THEN 1 ELSE 0 END) as chatbot_opens,
        SUM(CASE WHEN event_type = 'chat_started' THEN 1 ELSE 0 END) as chats_started,
        SUM(CASE WHEN event_type = 'bargain_completed' THEN 1 ELSE 0 END) as bargains_completed,
        ROUND(AVG(CASE WHEN final_price IS NOT NULL THEN discount_percentage ELSE NULL END), 2) as avg_discount,
        ROUND(AVG(CASE WHEN negotiation_duration IS NOT NULL THEN negotiation_duration ELSE NULL END), 2) as avg_duration
      FROM bargain_button_analytics
      WHERE shop_domain = $1
      AND event_timestamp > NOW() - INTERVAL '${interval}'
    `,
      [activeDomain],
    )

    // Get daily trend data
    const dailyTrends = await queryDb(
      `
      WITH dates AS (
        SELECT generate_series(
          date_trunc('day', NOW() - INTERVAL '${interval}'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS date
      )
      SELECT 
        TO_CHAR(dates.date, 'YYYY-MM-DD') as date,
        COALESCE(SUM(CASE WHEN event_type = 'button_view' THEN 1 ELSE 0 END), 0) as views,
        COALESCE(SUM(CASE WHEN event_type = 'button_click' THEN 1 ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN event_type = 'chat_started' THEN 1 ELSE 0 END), 0) as sessions,
        COALESCE(SUM(CASE WHEN event_type = 'bargain_completed' THEN 1 ELSE 0 END), 0) as conversions
      FROM dates
      LEFT JOIN bargain_button_analytics ON date_trunc('day', bargain_button_analytics.event_timestamp) = dates.date
        AND bargain_button_analytics.shop_domain = $1
      GROUP BY dates.date
      ORDER BY dates.date
    `,
      [activeDomain],
    )

    // Get top products data
    const topProducts = await queryDb(
      `
      SELECT 
        product_id,
        product_title,
        COUNT(*) as total_interactions,
        SUM(CASE WHEN event_type = 'button_click' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN event_type = 'bargain_completed' THEN 1 ELSE 0 END) as conversions,
        ROUND(AVG(CASE WHEN final_price IS NOT NULL THEN discount_percentage ELSE NULL END), 2) as avg_discount
      FROM bargain_button_analytics
      WHERE shop_domain = $1
      AND event_timestamp > NOW() - INTERVAL '${interval}'
      GROUP BY product_id, product_title
      ORDER BY total_interactions DESC
      LIMIT 5
    `,
      [activeDomain],
    )

    // Get conversion funnel data
    const conversionFunnel = await queryDb(
      `
      SELECT
        COUNT(DISTINCT CASE WHEN event_type = 'button_view' THEN session_id END) as views,
        COUNT(DISTINCT CASE WHEN event_type = 'button_click' THEN session_id END) as clicks,
        COUNT(DISTINCT CASE WHEN event_type = 'chat_started' THEN session_id END) as chats,
        COUNT(DISTINCT CASE WHEN event_type = 'bargain_completed' THEN session_id END) as completions
      FROM bargain_button_analytics
      WHERE shop_domain = $1
      AND event_timestamp > NOW() - INTERVAL '${interval}'
    `,
      [activeDomain],
    )

    // Get device breakdown
    const deviceBreakdown = await queryDb(
      `
      SELECT
        device_type,
        COUNT(DISTINCT session_id) as sessions
      FROM bargain_button_analytics
      WHERE shop_domain = $1
      AND event_timestamp > NOW() - INTERVAL '${interval}'
      AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY sessions DESC
    `,
      [activeDomain],
    )

    // Get recent bargain events
    const recentEvents = await queryDb(
      `
      SELECT
        id,
        event_type,
        event_timestamp,
        product_title,
        initial_offer,
        counter_offer,
        final_price,
        outcome,
        discount_percentage
      FROM bargain_button_analytics
      WHERE shop_domain = $1
      AND event_type IN ('bargain_completed', 'chat_started')
      ORDER BY event_timestamp DESC
      LIMIT 10
    `,
      [activeDomain],
    )

    return NextResponse.json({
      kpi: kpiData[0] || {},
      dailyTrends,
      topProducts,
      conversionFunnel: conversionFunnel[0] || {},
      deviceBreakdown,
      recentEvents,
      shopDomain: activeDomain,
    })
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}
