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
      `SELECT shop_domain FROM shopify_stores WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [user.id],
    )

    if (storeResult.length === 0) {
      return NextResponse.json({ error: "No connected Shopify store found" }, { status: 404 })
    }

    const shopDomain = storeResult[0].shop_domain

    // Check if bargain_requests table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_requests'
      );
    `)

    if (!tableExists[0]?.exists) {
      return NextResponse.json({
        data: [],
        message: "Conversion data will appear here once customers start making bargain requests",
      })
    }

    // Query conversion rate data from bargain_requests
    const conversionData = await queryDb(
      `
      WITH dates AS (
        SELECT generate_series(
          date_trunc('day', NOW() - INTERVAL '14 days'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS date
      ),
      daily_stats AS (
        SELECT 
          date_trunc('day', created_at) as day,
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests
        FROM bargain_requests
        WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '14 days'
        GROUP BY day
      )
      SELECT 
        TO_CHAR(dates.date, 'MM/DD') as date,
        CASE 
          WHEN COALESCE(total_requests, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(approved_requests, 0) * 100.0 / COALESCE(total_requests, 1)), 1)
        END as rate
      FROM dates
      LEFT JOIN daily_stats ON dates.date = daily_stats.day
      ORDER BY dates.date
    `,
      [user.id],
    )

    return NextResponse.json({ data: conversionData })
  } catch (error) {
    console.error("Error fetching conversion data:", error)
    return NextResponse.json({ error: "Failed to fetch conversion data" }, { status: 500 })
  }
}
