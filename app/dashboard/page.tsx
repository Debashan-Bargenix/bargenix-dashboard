import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Skeleton } from "@/components/ui/skeleton"
import { getShopifyStoreByUserId } from "@/app/actions/shopify-actions"
import { getUserMembership } from "@/app/actions/membership-actions"
import { getBargainRequests } from "@/app/actions/bargain-request-actions"
import { KpiCards } from "./components/kpi-cards"

import { AnalyticsOverviewWidget } from "./widgets/analytics-overview-widget"
import { InventoryStatusWidget } from "./widgets/inventory-status-widget"
import { BargainRequestsWidget } from "./widgets/bargain-requests-widget"
import { MembershipWidget } from "./widgets/membership-widget"
import { ShopifyStatusWidget } from "./widgets/shopify-status-widget"
import { RecentActivityWidget } from "./widgets/recent-activity-widget"
import { ConversionRateWidget } from "./widgets/conversion-rate-widget"
import { ProductPerformanceWidget } from "./widgets/product-performance-widget"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Get the user's connected store
  const store = await getShopifyStoreByUserId(user.id)
  const shopDomain = store?.shop_domain || ""

  // Get user's membership
  const membership = await getUserMembership(user.id)

  // Get bargain requests
  const bargainRequests = await getBargainRequests()

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Dashboard Overview"
        description="Welcome back! Here's what's happening with your bargaining platform."
      />

      {/* KPI Cards */}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }
      >
        <KpiCards userId={user.id} shopDomain={shopDomain} />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Analytics Overview - Full Width */}
        <div className="md:col-span-2 lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <AnalyticsOverviewWidget shopDomain={shopDomain} userId={user.id} />
          </Suspense>
        </div>

        {/* Conversion Rate Chart */}
        <div className="md:col-span-1 lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <ConversionRateWidget shopDomain={shopDomain} userId={user.id} />
          </Suspense>
        </div>

        {/* Product Performance */}
        <div className="md:col-span-1 lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <ProductPerformanceWidget shopDomain={shopDomain} userId={user.id} />
          </Suspense>
        </div>

        {/* Bargain Requests */}
        <div className="md:col-span-1">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <BargainRequestsWidget requests={bargainRequests} userId={user.id} />
          </Suspense>
        </div>

        {/* Inventory Status */}
        <div className="md:col-span-1">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <InventoryStatusWidget userId={user.id} />
          </Suspense>
        </div>

        {/* Shopify Status */}
        <div className="md:col-span-1">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <ShopifyStatusWidget store={store} userId={user.id} />
          </Suspense>
        </div>

        {/* Membership Status */}
        <div className="md:col-span-1">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <MembershipWidget membership={membership} userId={user.id} />
          </Suspense>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <RecentActivityWidget userId={user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
