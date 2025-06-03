import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getConnectedShopifyStore, checkAndUpdateStoreStatus } from "@/app/actions/shopify-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ConnectShopify from "./connect-shopify"
import ShopifyStoreDetails from "./shopify-store-details"
import { BargainButtonInstaller } from "./bargain-button-installer"

// Add dynamic export
export const dynamic = "force-dynamic"

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get the current user
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Check and update store status first
  await checkAndUpdateStoreStatus(user.id)

  // Get connected Shopify store
  const connectedStore = await getConnectedShopifyStore(user.id)

  // Determine active tab based on connected store and query params
  const activeTab = connectedStore ? "details" : "connect"

  // Get success/error messages from query params
  const success = searchParams.success === "true"
  const error = searchParams.error === "true"
  const message = searchParams.message as string | undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Shopify Integration</h1>
        <p className="text-sm text-gray-500">Connect and manage your Shopify store.</p>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-2">
          <TabsTrigger value="connect">Connect Store</TabsTrigger>
          <TabsTrigger value="details" disabled={!connectedStore}>
            Store Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Shopify Store</CardTitle>
              <CardDescription>
                Connect your Shopify store to enable bargaining features for your products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectShopify connectedStore={connectedStore} success={success} error={error} message={message} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          {connectedStore && (
            <>
              <ShopifyStoreDetails connectedStore={connectedStore} />

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Bargain Button</CardTitle>
                    <CardDescription>
                      Add a "Bargain a Deal" button to your product pages to allow customers to negotiate prices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BargainButtonInstaller shopDomain={connectedStore.shop_domain} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
