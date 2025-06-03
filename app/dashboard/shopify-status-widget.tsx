"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { ShoppingBag, CheckCircle, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ShopifyStatusWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchShopifyStatus()
  }, [])

  const fetchShopifyStatus = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 800))
      setData({
        connected: true,
        storeName: "My Awesome Store",
        lastSync: "2 minutes ago",
        scriptInstalled: true,
        productsSync: 245,
        webhooksActive: true,
      })
    } catch (error) {
      console.error("Error fetching Shopify status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Shopify Status" icon={<ShoppingBag className="h-5 w-5" />}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Shopify Integration"
      icon={<ShoppingBag className="h-5 w-5 text-green-600" />}
      gradient="green"
    >
      <div className="space-y-4">
        {data?.connected ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{data.storeName}</span>
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Connected</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Last Sync</span>
                <span className="text-muted-foreground">{data.lastSync}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Products Synced</span>
                <span className="font-medium">{data.productsSync}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Script Status</span>
                <div className="flex items-center">
                  {data.scriptInstalled ? (
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className="text-xs">{data.scriptInstalled ? "Installed" : "Not Installed"}</span>
                </div>
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/dashboard/shopify">Manage Integration</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Store not connected</p>
            <Button asChild size="sm" className="w-full">
              <Link href="/dashboard/shopify">Connect Shopify</Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardCard>
  )
}
