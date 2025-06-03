import { Suspense } from "react"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { redirect } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const metadata = {
  title: "Analytics | Bargenix",
  description: "Track and analyze your bargaining performance",
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Get the user's connected store
  const storeQuery = `
    SELECT shop_domain FROM shopify_stores
    WHERE user_id = $1
    AND status = 'active'
    LIMIT 1
  `

  let shopDomain = ""
  let error = null

  try {
    const storeResult = await queryDb(storeQuery, [user.id])
    shopDomain = storeResult[0]?.shop_domain || ""
  } catch (err) {
    console.error("Error fetching store data:", err)
    error = "Failed to fetch store data. Please try again later."
  }

  // Check if the user has a connected store
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!shopDomain) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Shopify store connected</AlertTitle>
          <AlertDescription>
            You need to connect your Shopify store before you can view analytics. Please go to the Shopify integration
            page to connect your store.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<AnalyticsLoadingSkeleton />}>
        <AnalyticsDashboard shopDomain={shopDomain} />
      </Suspense>
    </div>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </div>
  )
}
