"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { RefreshCw, Package, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ProductPerformanceWidgetProps {
  shopDomain: string
}

export function ProductPerformanceWidget({ shopDomain }: ProductPerformanceWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  useEffect(() => {
    fetchProductData()
  }, [shopDomain])

  const fetchProductData = async () => {
    if (!shopDomain) {
      setError("No Shopify store connected")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/top-products?shopDomain=${encodeURIComponent(shopDomain)}`)

      if (!response.ok) {
        throw new Error("Failed to fetch product data")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setData([])
      } else {
        setData(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching product data:", error)
      setError("Failed to load product data")
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchProductData()
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[250px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Product Data Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-medium mb-2">No Product Data Yet</h3>
          <p className="text-sm text-muted-foreground">
            Start collecting data by enabling the bargain button on your products.
          </p>
        </div>
      )
    }

    return (
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="sessions"
              nameKey="title"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [`${value} sessions`, props.payload.title]}
              labelFormatter={() => "Product"}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <DashboardCard
      title="Top Performing Products"
      description="Products with most bargain sessions"
      icon={<Package className="h-5 w-5 text-amber-600" />}
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
      gradient="amber"
    >
      {renderContent()}
    </DashboardCard>
  )
}
