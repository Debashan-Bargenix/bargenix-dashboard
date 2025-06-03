import { Package, MessageSquare, TrendingUp, AlertCircle, Percent } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { queryDb } from "@/lib/db"

interface KpiCardsProps {
  userId: string
  shopDomain?: string
}

export async function KpiCards({ userId, shopDomain }: KpiCardsProps) {
  // Get KPI data directly from the database
  const kpiData = await getKpiData(userId, shopDomain || "")

  const { totalProducts, bargainingEnabled, sessionCount, conversionRate, pendingRequests, averageDiscount } = kpiData

  // Calculate product usage percentage
  const productUsagePercent = totalProducts > 0 ? (bargainingEnabled / totalProducts) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <DashboardCard className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Bargaining Products</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-2xl font-bold text-blue-600">{bargainingEnabled}</h3>
              <p className="ml-2 text-sm text-muted-foreground">of {totalProducts}</p>
            </div>
          </div>
          <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900/30">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="mt-3">
          <Progress value={productUsagePercent} className="h-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">{productUsagePercent.toFixed(0)}% of products enabled</p>
        </div>
      </DashboardCard>

      <DashboardCard className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Bargain Sessions</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-2xl font-bold text-green-600">{sessionCount}</h3>
              <p className="ml-2 text-sm text-muted-foreground">last 7 days</p>
            </div>
          </div>
          <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/30">
            <MessageSquare className="h-5 w-5 text-green-600" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            {sessionCount > 0
              ? "Customers are actively engaging with your bargaining feature"
              : "No bargain sessions recorded in the last week"}
          </p>
        </div>
      </DashboardCard>

      <DashboardCard className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-2xl font-bold text-amber-600">{conversionRate}%</h3>
              <p className="ml-2 text-sm text-muted-foreground">last 30 days</p>
            </div>
          </div>
          <div className="p-2 bg-amber-100 rounded-full dark:bg-amber-900/30">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            {Number.parseFloat(conversionRate) > 0
              ? `${conversionRate}% of bargain sessions convert to sales`
              : "No conversions recorded yet"}
          </p>
        </div>
      </DashboardCard>

      <DashboardCard className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-2xl font-bold text-purple-600">{pendingRequests}</h3>
              <p className="ml-2 text-sm text-muted-foreground">to review</p>
            </div>
          </div>
          <div className="p-2 bg-purple-100 rounded-full dark:bg-purple-900/30">
            <AlertCircle className="h-5 w-5 text-purple-600" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            {pendingRequests > 0
              ? `${pendingRequests} bargain requests waiting for your review`
              : "No pending bargain requests"}
          </p>
        </div>
      </DashboardCard>

      <DashboardCard className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg. Discount</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-2xl font-bold text-rose-600">{averageDiscount}%</h3>
              <p className="ml-2 text-sm text-muted-foreground">approved</p>
            </div>
          </div>
          <div className="p-2 bg-rose-100 rounded-full dark:bg-rose-900/30">
            <Percent className="h-5 w-5 text-rose-600" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            {averageDiscount > 0 ? `Average discount on approved bargains` : "No approved bargains yet"}
          </p>
        </div>
      </DashboardCard>
    </div>
  )
}

async function getKpiData(userId: string, shopDomain: string) {
  try {
    // Get total products with bargaining enabled
    let totalProducts = 0
    let bargainingEnabled = 0

    try {
      const productsQuery = await queryDb(
        `
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN bargaining_enabled = true THEN 1 ELSE 0 END) as bargaining_enabled
        FROM shopify_products
        WHERE user_id = $1
        `,
        [userId],
      )

      totalProducts = Number.parseInt(productsQuery[0]?.total_products || "0")
      bargainingEnabled = Number.parseInt(productsQuery[0]?.bargaining_enabled || "0")
    } catch (error) {
      console.error("Error fetching product data:", error)
      // Fallback to default values
    }

    // Get bargain sessions in last 7 days
    let sessionCount = 0

    try {
      const sessionsQuery = await queryDb(
        `
        SELECT COUNT(*) as session_count
        FROM bargain_sessions
        WHERE created_at > NOW() - INTERVAL '7 days'
        AND shop_domain = $1
        `,
        [shopDomain],
      )

      sessionCount = Number.parseInt(sessionsQuery[0]?.session_count || "0")
    } catch (error) {
      console.error("Error fetching session data:", error)
      // Fallback to default values
    }

    // Get conversion rate
    let conversionRate = "0.0"

    try {
      const conversionQuery = await queryDb(
        `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as converted_sessions
        FROM bargain_sessions
        WHERE created_at > NOW() - INTERVAL '30 days'
        AND shop_domain = $1
        `,
        [shopDomain],
      )

      const totalSessions = Number.parseInt(conversionQuery[0]?.total_sessions || "0")
      const convertedSessions = Number.parseInt(conversionQuery[0]?.converted_sessions || "0")

      if (totalSessions > 0) {
        conversionRate = ((convertedSessions / totalSessions) * 100).toFixed(1)
      }
    } catch (error) {
      console.error("Error fetching conversion data:", error)
      // Fallback to default values
    }

    // Get pending bargain requests
    let pendingRequests = 0

    try {
      const requestsQuery = await queryDb(
        `
        SELECT COUNT(*) as pending_count
        FROM bargain_requests
        WHERE status = 'pending'
        AND user_id = $1
        `,
        [userId],
      )

      pendingRequests = Number.parseInt(requestsQuery[0]?.pending_count || "0")
    } catch (error) {
      console.error("Error fetching requests data:", error)
      // Fallback to default values
    }

    // Get average discount
    let averageDiscount = 0

    try {
      const discountQuery = await queryDb(
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
        [userId],
      )

      averageDiscount = Number.parseFloat(discountQuery[0]?.avg_discount || "0").toFixed(1)
    } catch (error) {
      console.error("Error fetching discount data:", error)
      // Fallback to default values
    }

    return {
      totalProducts,
      bargainingEnabled,
      sessionCount,
      conversionRate,
      pendingRequests,
      averageDiscount,
    }
  } catch (error) {
    console.error("Error in getKpiData:", error)
    // Return default values if anything fails
    return {
      totalProducts: 0,
      bargainingEnabled: 0,
      sessionCount: 0,
      conversionRate: "0.0",
      pendingRequests: 0,
      averageDiscount: "0.0",
    }
  }
}
