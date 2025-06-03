"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { TrendingUp, BarChart3 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

export function PerformanceMetricsWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setData({
        conversionRate: [
          { day: "Mon", rate: 22 },
          { day: "Tue", rate: 25 },
          { day: "Wed", rate: 28 },
          { day: "Thu", rate: 24 },
          { day: "Fri", rate: 31 },
          { day: "Sat", rate: 29 },
          { day: "Sun", rate: 26 },
        ],
        revenue: [
          { day: "Mon", amount: 1200 },
          { day: "Tue", amount: 1450 },
          { day: "Wed", amount: 1680 },
          { day: "Thu", amount: 1320 },
          { day: "Fri", amount: 1890 },
          { day: "Sat", amount: 1750 },
          { day: "Sun", amount: 1580 },
        ],
      })
    } catch (error) {
      console.error("Error fetching performance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Performance Metrics" icon={<BarChart3 className="h-5 w-5" />}>
        <Skeleton className="h-48 w-full" />
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Performance Metrics"
      description="Conversion rates and revenue trends"
      icon={<TrendingUp className="h-5 w-5 text-green-600" />}
      gradient="green"
    >
      <div className="space-y-6">
        {/* Conversion Rate Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Conversion Rate (%)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.conversionRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-md shadow-md p-2 text-xs">
                          <p>{`${payload[0].payload.day}: ${payload[0].value}%`}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Revenue ($)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-md shadow-md p-2 text-xs">
                          <p>{`${payload[0].payload.day}: $${payload[0].value}`}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}
