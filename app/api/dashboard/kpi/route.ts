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
    const shopDomain = storeResult[0]?.shop_domain || ""

    // Check which tables exist
    const tablesCheck = await queryDb(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_bargaining_settings') as pbs_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bargain_requests') as br_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bargain_sessions') as bs_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_products') as sp_exists
    `)
    const tableExists = tablesCheck[0]

    // 1. Total Products with Bargaining Enabled
    let bargainingProducts = 0
    let totalProducts = 0

    if (tableExists.pbs_exists) {
      const productsResult = await queryDb(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN bargaining_enabled = true THEN 1 ELSE 0 END) as enabled
        FROM product_bargaining_settings 
        WHERE user_id = $1
      `,
        [user.id],
      )
      totalProducts = Number.parseInt(productsResult[0]?.total || "0")
      bargainingProducts = Number.parseInt(productsResult[0]?.enabled || "0")
    } else if (tableExists.sp_exists) {
      // Fallback to shopify_products table
      const productsResult = await queryDb(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN bargaining_enabled = true THEN 1 ELSE 0 END) as enabled
        FROM shopify_products 
        WHERE user_id = $1
      `,
        [user.id],
      )
      totalProducts = Number.parseInt(productsResult[0]?.total || "0")
      bargainingProducts = Number.parseInt(productsResult[0]?.enabled || "0")
    }

    // 2. Active Bargain Sessions (last 7 days)
    let activeSessions = 0
    if (tableExists.bs_exists) {
      const sessionsResult = await queryDb(
        `
        SELECT COUNT(*) as count
        FROM bargain_sessions
        WHERE created_at > NOW() - INTERVAL '7 days'
        ${shopDomain ? "AND shop_domain = $2" : ""}
      `,
        shopDomain ? [user.id, shopDomain] : [user.id],
      )
      activeSessions = Number.parseInt(sessionsResult[0]?.count || "0")
    }

    // 3. Conversion Rate (last 30 days)
    let conversionRate = 0
    if (tableExists.bs_exists) {
      const conversionResult = await queryDb(
        `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as converted_sessions
        FROM bargain_sessions
        WHERE created_at > NOW() - INTERVAL '30 days'
        ${shopDomain ? "AND shop_domain = $2" : ""}
      `,
        shopDomain ? [user.id, shopDomain] : [user.id],
      )
      const total = Number.parseInt(conversionResult[0]?.total_sessions || "0")
      const converted = Number.parseInt(conversionResult[0]?.converted_sessions || "0")
      conversionRate = total > 0 ? (converted / total) * 100 : 0
    } else if (tableExists.br_exists) {
      // Fallback to bargain_requests
      const conversionResult = await queryDb(
        `
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests
        FROM bargain_requests
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      `,
        [user.id],
      )
      const total = Number.parseInt(conversionResult[0]?.total_requests || "0")
      const approved = Number.parseInt(conversionResult[0]?.approved_requests || "0")
      conversionRate = total > 0 ? (approved / total) * 100 : 0
    }

    // 4. Pending Bargain Requests
    let pendingRequests = 0
    if (tableExists.br_exists) {
      const pendingResult = await queryDb(
        `SELECT COUNT(*) as count FROM bargain_requests WHERE user_id = $1 AND status = 'pending'`,
        [user.id],
      )
      pendingRequests = Number.parseInt(pendingResult[0]?.count || "0")
    }

    // 5. Average Discount Offered
    let averageDiscount = 0
    if (tableExists.br_exists) {
      const discountResult = await queryDb(
        `
        SELECT AVG(
          CASE 
            WHEN original_price > 0 AND requested_price > 0 
            THEN ((original_price - requested_price) / original_price) * 100
            ELSE 0
          END
        ) as avg_discount
        FROM bargain_requests 
        WHERE user_id = $1 
        AND status = 'approved'
        AND created_at > NOW() - INTERVAL '30 days'
      `,
        [user.id],
      )
      averageDiscount = Number.parseFloat(discountResult[0]?.avg_discount || "0")
    }

    return NextResponse.json({
      data: {
        bargainingProducts,
        totalProducts,
        activeSessions,
        conversionRate: Number.parseFloat(conversionRate.toFixed(1)),
        pendingRequests,
        averageDiscount: Number.parseFloat(averageDiscount.toFixed(1)),
      },
    })
  } catch (error) {
    console.error("Error fetching KPI data:", error)
    return NextResponse.json({ error: "Failed to fetch KPI data" }, { status: 500 })
  }
}
