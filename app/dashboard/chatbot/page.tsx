import { Suspense } from "react"
import { BargainButtonDashboard } from "./bargain-button-dashboard"
import { getShopifyStoreByUserId } from "@/app/actions/shopify-actions"
import { getCurrentUser } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ChatbotPage() {
  const user = await getCurrentUser()
  let shopDomain = ""

  if (user) {
    const store = await getShopifyStoreByUserId(user.id)
    if (store) {
      shopDomain = store.shop_domain
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-2">Bargain Button</h1>
      <p className="text-muted-foreground mb-6">Manage the bargain button on your Shopify store product pages.</p>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        }
      >
        <BargainButtonDashboard shopDomain={shopDomain} />
      </Suspense>
    </div>
  )
}
