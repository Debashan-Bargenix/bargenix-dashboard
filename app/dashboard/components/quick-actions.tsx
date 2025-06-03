"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Package, ShoppingBag, Settings, RefreshCw, MessageSquare, CreditCard, ChevronRight } from "lucide-react"
import { syncShopifyProducts } from "@/app/actions/shopify-inventory-actions"
import { toast } from "@/hooks/use-toast"

interface QuickActionsProps {
  userId: string
  hasStore: boolean
}

export function QuickActions({ userId, hasStore }: QuickActionsProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncProducts = async () => {
    if (!hasStore) {
      toast({
        title: "No store connected",
        description: "Connect your Shopify store first to sync products",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSyncing(true)
      await syncShopifyProducts(userId)
      toast({
        title: "Products synced successfully",
        description: "Your Shopify products have been synchronized",
      })
    } catch (error) {
      console.error("Error syncing products:", error)
      toast({
        title: "Sync failed",
        description: "There was an error syncing your products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Quick Actions</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/system" className="text-sm text-muted-foreground flex items-center">
            More actions
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="bg-white dark:bg-gray-800"
          onClick={handleSyncProducts}
          disabled={isSyncing || !hasStore}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Products"}
        </Button>

        <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
          <Link href="/dashboard/inventory">
            <Package className="mr-2 h-4 w-4" />
            Manage Inventory
          </Link>
        </Button>

        <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
          <Link href="/dashboard/request-bargain">
            <MessageSquare className="mr-2 h-4 w-4" />
            Review Requests
          </Link>
        </Button>

        <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
          <Link href="/dashboard/shopify">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Shopify Settings
          </Link>
        </Button>

        <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
          <Link href="/dashboard/memberships">
            <CreditCard className="mr-2 h-4 w-4" />
            Membership
          </Link>
        </Button>

        <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
          <Link href="/dashboard/chatbot">
            <Settings className="mr-2 h-4 w-4" />
            Button Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}
