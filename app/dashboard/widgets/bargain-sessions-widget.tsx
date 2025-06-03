"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { MessageSquare, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BargainSessionsWidgetProps {
  shopDomain: string
  hasAnalytics: boolean
}

export function BargainSessionsWidget({ shopDomain, hasAnalytics }: BargainSessionsWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [totalSessions, setTotalSessions] = useState<number>(0)

  useEffect(() => {
    if (shopDomain) {
      fetchSessionsData()
    } else {
      setLoading(false)
      setError("No Shopify store connected")
    }
  }, [shopDomain])

  const fetchSessionsData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!hasAnalytics) {
        setLoading(false)
        setError("Analytics data not available yet")
        return
      }

      const response = await fetch(`/api/analytics/data?shop=${shopDomain}&timeRange=7days`)

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch analytics data")
      }

      // Get chat sessions data
      const chatStarted = result.data.summary.chatStarted || 0
      setTotalSessions(chatStarted)

      // Transform data for the chart - filter for chat_started events
      const chatEvents = result.data.eventsByType.find(
        (type: any) => type.event_type === "chat_started" || type.event_type === "bargain_started",
      )

      // Create data points based on eventsByDay
      const chartData = result.data.eventsByDay.map((day: any) => {
        // Estimate chat sessions as a portion of total events for that day
        const chatSessionsEstimate = Math.round(day.count * 0.4) // 40% of events are chat sessions (estimate)

        return {
          date: day.day.substring(5), // Format: MM-DD
          sessions: chatSessionsEstimate,
        }
      })

      setData(chartData)
    } catch (error) {
      console.error("Error fetching sessions data:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchSessionsData()
  }

  if (loading) {
    return (
      <DashboardCard title="Bargain Sessions" icon={<MessageSquare className="h-5 w-5" />}>
        <Skeleton className="h-48 w-full" />
      </DashboardCard>
    )
  }

  if (error) {
    return (
      <DashboardCard
        title="Bargain Sessions"
        icon={<MessageSquare className="h-5 w-5" />}
        action={
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={!shopDomain || !hasAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      >
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Bargain Sessions"
      description={`${totalSessions} total sessions`}
      icon={<MessageSquare className="h-5 w-5 text-purple-600" />}
      action={
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      <div className="h-48">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No session data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} sessions`, "Sessions"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  )
}
