"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { BarChart3, RefreshCw, MousePointer, MessageSquare } from "lucide-react"

interface AnalyticsWidgetProps {
  shopDomain: string
}

export function AnalyticsWidget({ shopDomain }: AnalyticsWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (shopDomain) {
      fetchAnalytics()
    } else {
      setLoading(false)
    }
  }, [shopDomain]) // Only fetch when shopDomain changes or component mounts

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/data?shop=${encodeURIComponent(shopDomain)}&timeRange=7days`)

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      }
    } catch (error) {
      console.error("Error fetching analytics for widget:", error)
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data
  const chartData =
    data?.eventsByDay?.map((item: any) => ({
      name: new Date(item.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Number(item.count),
    })) || []

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bargain Activity</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[100px] w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
          </div>
        ) : data && data.summary ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3">
                <div className="flex items-center text-xs text-muted-foreground mb-1">
                  <MousePointer className="h-3 w-3 mr-1 text-blue-500" />
                  Button Clicks
                </div>
                <div className="text-2xl font-bold">{data.summary.buttonClicks || 0}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3">
                <div className="flex items-center text-xs text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3 mr-1 text-green-500" />
                  Chatbot Views
                </div>
                <div className="text-2xl font-bold">{data.summary.chatbotViews || 0}</div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[100px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-md shadow-md p-2 text-xs">
                              <p>{`${payload[0].payload.name}: ${payload[0].value} events`}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No activity data available</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline">
                View detailed analytics
              </Link>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-muted-foreground text-center">No bargain activity data available yet</p>
            <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline mt-4">
              View analytics dashboard
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
