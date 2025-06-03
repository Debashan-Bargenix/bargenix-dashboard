"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AnalyticsOverviewWidgetProps {
  shopDomain: string
  userId: string
}

export function AnalyticsOverviewWidget({ shopDomain, userId }: AnalyticsOverviewWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [timeframe, setTimeframe] = useState("week")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeframe])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/data?timeframe=${timeframe}`)

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setData([])
      } else {
        setData(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      setError("Failed to load analytics data")
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalyticsData()
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[300px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Analytics Data Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Analytics Data Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start collecting data by enabling the bargain button on your products.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/chatbot">Configure Bargain Button</a>
          </Button>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Legend />
          <Bar dataKey="views" fill="#3b82f6" name="Button Views" />
          <Bar dataKey="clicks" fill="#10b981" name="Button Clicks" />
          <Bar dataKey="sessions" fill="#f59e0b" name="Bargain Sessions" />
          <Bar dataKey="conversions" fill="#ef4444" name="Conversions" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <DashboardCard
      title="Analytics Overview"
      icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
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
      <Tabs defaultValue="week" value={timeframe} onValueChange={setTimeframe} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="week">Last 7 Days</TabsTrigger>
            <TabsTrigger value="month">Last 30 Days</TabsTrigger>
            <TabsTrigger value="quarter">Last 90 Days</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="week" className="mt-0">
          {renderContent()}
        </TabsContent>
        <TabsContent value="month" className="mt-0">
          {renderContent()}
        </TabsContent>
        <TabsContent value="quarter" className="mt-0">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </DashboardCard>
  )
}
