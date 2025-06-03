import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
        data: [],
        message: "Product performance data will appear here once customers start making bargain requests",
      })
    }

    // Query top performing products from bargain_requests
    const productData = await queryDb(
      `
      SELECT 
        product_title as title,
        COUNT(*) as sessions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as conversions
      FROM bargain_requests
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
      AND product_title IS NOT NULL
      GROUP BY product_title
      ORDER BY sessions DESC
      LIMIT 5
    `,
      [user.id],
    )

    return NextResponse.json({ data: productData })
  } catch (error) {
    console.error("Error fetching top products data:", error)
    return NextResponse.json({ error: "Failed to fetch top products data" }, { status: 500 })
  }
}
