import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if product_bargaining_settings table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_bargaining_settings'
      );
    `)

    if (!tableExists[0]?.exists) {
      return NextResponse.json({
        data: { totalProducts: 0, bargainingEnabled: 0, lowStock: 0, outOfStock: 0 },
        message: "Inventory data will appear here once you sync products from Shopify",
      })
    }

    // Get inventory summary from product_bargaining_settings
    const inventorySummary = await queryDb(
      `
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN bargaining_enabled = true THEN 1 ELSE 0 END) as bargaining_enabled
      FROM product_bargaining_settings
      WHERE user_id = $1
    `,
      [user.id],
    )

    const summary = inventorySummary[0] || { total_products: 0, bargaining_enabled: 0 }

    return NextResponse.json({
      data: {
        totalProducts: Number.parseInt(summary.total_products) || 0,
        bargainingEnabled: Number.parseInt(summary.bargaining_enabled) || 0,
        lowStock: 0, // This would require Shopify inventory data
        outOfStock: 0, // This would require Shopify inventory data
      },
    })
  } catch (error) {
    console.error("Error fetching inventory summary:", error)
    return NextResponse.json({ error: "Failed to fetch inventory summary" }, { status: 500 })
  }
}
