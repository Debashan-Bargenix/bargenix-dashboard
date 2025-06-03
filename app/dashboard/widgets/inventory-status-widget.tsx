"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Package, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

interface InventoryStatusWidgetProps {
  userId: string
}

export function InventoryStatusWidget({ userId }: InventoryStatusWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInventoryData()
  }, [userId])

  const fetchInventoryData = async () => {
    if (!userId) {
      setError("User ID is required")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/inventory/summary?userId=${encodeURIComponent(userId)}`)

      if (!response.ok) {
        throw new Error("Failed to fetch inventory data")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data || null)
      }
    } catch (error) {
      console.error("Error fetching inventory data:", error)
      setError("Failed to load inventory data")
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInventoryData()
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[200px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Inventory Data Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    if (!data || data.totalProducts === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-medium mb-2">No Products Found</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Connect your Shopify store and sync products to get started.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/shopify">Connect Store</Link>
          </Button>
        </div>
      )
    }

    const bargainingPercent = data.totalProducts > 0 ? (data.bargainingEnabled / data.totalProducts) * 100 : 0

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.totalProducts}</div>
            <div className="text-xs text-muted-foreground">Total Products</div>
          </div>
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.bargainingEnabled}</div>
            <div className="text-xs text-muted-foreground">Bargain Enabled</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Bargaining Enabled</span>
            <span>{bargainingPercent.toFixed(0)}%</span>
          </div>
          <Progress value={bargainingPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          {data.lowStock > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <AlertCircle className="h-3 w-3 text-amber-500 mr-1" />
                Low Stock
              </span>
              <span className="font-medium">{data.lowStock}</span>
            </div>
          )}
          {data.outOfStock > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                Out of Stock
              </span>
              <span className="font-medium">{data.outOfStock}</span>
            </div>
          )}
        </div>

        <Button asChild size="sm" className="w-full">
          <Link href="/dashboard/inventory">Manage Inventory</Link>
        </Button>
      </div>
    )
  }

  return (
    <DashboardCard
      title="Inventory Status"
      icon={<Package className="h-5 w-5 text-blue-600" />}
      badge={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      }
      gradient="blue"
    >
      {renderContent()}
    </DashboardCard>
  )
}
