"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Package, TrendingUp, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function InventorySummaryWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const fetchInventoryData = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setData({
        totalProducts: 245,
        bargainEnabled: 156,
        outOfStock: 12,
        lowStock: 8,
        recentlyAdded: 5,
      })
    } catch (error) {
      console.error("Error fetching inventory data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Inventory Overview" icon={<Package className="h-5 w-5" />}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Inventory Overview" icon={<Package className="h-5 w-5 text-blue-600" />} gradient="blue">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data?.totalProducts || 0}</div>
            <div className="text-xs text-muted-foreground">Total Products</div>
          </div>
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data?.bargainEnabled || 0}</div>
            <div className="text-xs text-muted-foreground">Bargain Enabled</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <AlertCircle className="h-3 w-3 text-amber-500 mr-1" />
              Low Stock
            </span>
            <span className="font-medium">{data?.lowStock || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
              Out of Stock
            </span>
            <span className="font-medium">{data?.outOfStock || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              Recently Added
            </span>
            <span className="font-medium">{data?.recentlyAdded || 0}</span>
          </div>
        </div>

        <Button asChild size="sm" className="w-full">
          <Link href="/dashboard/inventory">Manage Inventory</Link>
        </Button>
      </div>
    </DashboardCard>
  )
}
