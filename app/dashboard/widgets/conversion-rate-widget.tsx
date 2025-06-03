"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ConversionRateWidgetProps {
  shopDomain: string
  userId: string
}

export function ConversionRateWidget({ shopDomain, userId }: ConversionRateWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConversionData()
  }, [])

  const fetchConversionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/conversion`)

      if (!response.ok) {
        throw new Error("Failed to fetch conversion data")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setData([])
      } else {
        setData(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching conversion data:", error)
      setError("Failed to load conversion data")
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchConversionData()
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[250px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Conversion Data Unavailable</h3>
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
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-medium mb-2">No Conversion Data Yet</h3>
          <p className="text-sm text-muted-foreground">
            Conversion data will appear here once customers start making bargain requests.
          </p>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => [`${value}%`, "Conversion Rate"]} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#10b981"
            name="Conversion Rate"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <DashboardCard
      title="Conversion Rate Trend"
      description="Bargain requests to approvals"
      icon={<TrendingUp className="h-5 w-5 text-green-600" />}
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
    >
      {renderContent()}
    </DashboardCard>
  )
}
