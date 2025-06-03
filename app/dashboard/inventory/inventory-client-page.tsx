"use client"

import { useEffect, useState } from "react"
import { getInventoryData, syncInventoryData } from "@/app/actions/inventory-client-actions"
import { InventorySummary } from "./inventory-summary"
import { ProductTable } from "./product-table"
import { CategoryBreakdown } from "./category-breakdown"
import { NoStoreConnected } from "./no-store-connected"
import { getShopifyStoreData } from "@/app/actions/inventory-client-actions"
import { useToast } from "@/hooks/use-toast"
import { InventoryHeader } from "./inventory-header"
import { InventorySkeleton } from "./inventory-skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryClientPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [inventoryData, setInventoryData] = useState<any>(null)
  const [storeData, setStoreData] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [inventory, store] = await Promise.all([getInventoryData(), getShopifyStoreData()])
        setInventoryData(inventory)
        setStoreData(store)
      } catch (error) {
        console.error("Error loading inventory data:", error)
        toast({
          title: "Error",
          description: "Failed to load inventory data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      const result = await syncInventoryData()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })

        // Show loading state while refreshing data
        setIsLoading(true)

        // Refresh the data
        const inventory = await getInventoryData()
        setInventoryData(inventory)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing inventory:", error)
      toast({
        title: "Error",
        description: "Failed to sync inventory",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      const inventory = await getInventoryData()
      setInventoryData(inventory)
    } catch (error) {
      console.error("Error refreshing inventory data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh inventory data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!storeData && isLoading) {
    return <InventorySkeleton />
  }

  if (!storeData) {
    return <NoStoreConnected />
  }

  // Show skeleton while loading
  if (isLoading) {
    return <InventorySkeleton />
  }

  // Ensure categories is always an array
  const categories = Array.isArray(inventoryData?.categories) ? inventoryData.categories : []

  return (
    <div className="space-y-8">
      {/* Header with sync status and store info */}
      <InventoryHeader
        storeName={storeData.shopDomain || ""}
        isConnected={!!storeData.isConnected}
        lastSynced={inventoryData?.lastSynced || null}
        isSyncing={isSyncing}
        onSync={handleSync}
      />

      {/* Inventory Summary */}
      <InventorySummary
        totalProducts={inventoryData?.totalProducts || 0}
        totalVariants={inventoryData?.totalVariants || 0}
        totalInventory={inventoryData?.totalInventory || 0}
        totalValue={inventoryData?.totalValue || 0}
        bargainingEnabled={inventoryData?.bargainingEnabled || 0}
        membership={
          inventoryData?.membership || {
            name: "Free",
            productsAllowed: 0,
            productsUsed: 0,
          }
        }
        currency={inventoryData?.currency || "USD"}
        isLoading={false}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-0">
          <ProductTable
            products={inventoryData?.products || []}
            currency={inventoryData?.currency || "USD"}
            isLoading={false}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <CategoryBreakdown categories={categories} isLoading={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
