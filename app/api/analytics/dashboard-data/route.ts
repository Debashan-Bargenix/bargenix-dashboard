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
    const userId = searchParams.get("userId")
    const shopDomain = searchParams.get("shopDomain")
    const timeRange = searchParams.get("timeRange") || "7days"

    if (!userId || !shopDomain) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Determine date range
    let interval: string
    switch (timeRange) {
      case "24hours":
        interval = "1 day"
        break
      case "30days":
        interval = "30 days"
        break
      case "90days":
        interval = "90 days"
        break
      case "7days":
      default:
        interval = "7 days"
        break
    }

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
        success: true,
        data: {
          summary: {
            totalRequests: 0,
            approvedRequests: 0,
            pendingRequests: 0,
          },
          requestsByDay: [],
          recentRequests: [],
          topProducts: [],
        },
      })
    }

    // Get summary data
    const summaryData = await queryDb(
      `
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests
      FROM bargain_requests
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '${interval}'
    `,
      [userId],
    )

    // Get requests by day
    const requestsByDay = await queryDb(
      `
      WITH dates AS (
        SELECT generate_series(
          date_trunc('day', NOW() - INTERVAL '${interval}'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS day
      )
      SELECT 
        dates.day,
        COALESCE(COUNT(br.id), 0) as count
      FROM dates
      LEFT JOIN bargain_requests br ON date_trunc('day', br.created_at) = dates.day
        AND br.user_id = $1
        AND br.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY dates.day
      ORDER BY dates.day
    `,
      [userId],
    )

    // Get recent requests
    const recentRequests = await queryDb(
      `
      SELECT 
        product_title,
        product_id,
        customer_email,
        status,
        created_at
      FROM bargain_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [userId],
    )

    // Get top products
    const topProducts = await queryDb(
      `
      SELECT 
        product_title,
        product_id,
        COUNT(*) as request_count
      FROM bargain_requests
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
      AND product_title IS NOT NULL
      GROUP BY product_title, product_id
      ORDER BY request_count DESC
      LIMIT 5
    `,
      [userId],
    )

    const summary = summaryData[0] || {
      total_requests: 0,
      approved_requests: 0,
      pending_requests: 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRequests: Number(summary.total_requests),
          approvedRequests: Number(summary.approved_requests),
          pendingRequests: Number(summary.pending_requests),
        },
        requestsByDay,
        recentRequests,
        topProducts,
      },
    })
  } catch (error) {
    console.error("Error fetching analytics dashboard data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch analytics data",
      },
      { status: 500 },
    )
  }
}
