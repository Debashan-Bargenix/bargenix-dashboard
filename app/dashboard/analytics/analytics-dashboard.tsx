"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Calendar,
  Users,
  MousePointer,
  ShoppingCart,
  Clock,
  Percent,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { format, parseISO } from "date-fns"

interface AnalyticsProps {
  shopDomain: string
}

export function AnalyticsDashboard({ shopDomain }: AnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState("week")
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (shopDomain) {
      fetchAnalytics()
    } else {
      setLoading(false)
      setError("No shop domain provided")
    }
  }, [shopDomain, timeframe])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/analytics/data?shop=${encodeURIComponent(shopDomain)}&timeframe=${timeframe}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch analytics: ${response.status}`)
      }

      const result = await response.json()
      setAnalyticsData(result)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AnalyticsLoadingSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading analytics</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Check if we have any data
  const hasData =
    analyticsData &&
    (analyticsData.kpi?.total_events > 0 ||
      (analyticsData.dailyTrends &&
        analyticsData.dailyTrends.some(
          (day: any) => day.views > 0 || day.clicks > 0 || day.sessions > 0 || day.conversions > 0,
        )))

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-muted-foreground">Track your bargaining performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAnalytics} title="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              There is no analytics data available for {shopDomain} in this time period.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No bargain button interactions have been recorded yet. Data will appear here once customers start using
                the bargain feature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Format data for charts
  const dailyTrendsData = analyticsData.dailyTrends.map((item: any) => ({
    date: format(parseISO(item.date), "MMM dd"),
    views: Number(item.views || 0),
    clicks: Number(item.clicks || 0),
    sessions: Number(item.sessions || 0),
    conversions: Number(item.conversions || 0),
  }))

  const funnelData = [
    { name: "Views", value: Number(analyticsData.conversionFunnel?.views || 0) },
    { name: "Clicks", value: Number(analyticsData.conversionFunnel?.clicks || 0) },
    { name: "Chats", value: Number(analyticsData.conversionFunnel?.chats || 0) },
    { name: "Completions", value: Number(analyticsData.conversionFunnel?.completions || 0) },
  ]

  const deviceData =
    analyticsData.deviceBreakdown?.map((item: any) => ({
      name: item.device_type || "Unknown",
      value: Number(item.sessions || 0),
    })) || []

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      case "desktop":
        return <Monitor className="h-4 w-4" />
      case "laptop":
        return <Laptop className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {shopDomain}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics} title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Interactions"
              value={analyticsData.kpi?.total_events || 0}
              icon={<MousePointer className="h-4 w-4" />}
              description="Button views, clicks & chats"
              color="blue"
            />

            <MetricCard
              title="Unique Sessions"
              value={analyticsData.kpi?.unique_sessions || 0}
              icon={<Users className="h-4 w-4" />}
              description="Distinct customer sessions"
              color="green"
            />

            <MetricCard
              title="Bargains Completed"
              value={analyticsData.kpi?.bargains_completed || 0}
              icon={<ShoppingCart className="h-4 w-4" />}
              description="Successful negotiations"
              color="amber"
            />

            <MetricCard
              title="Avg. Discount"
              value={`${analyticsData.kpi?.avg_discount || 0}%`}
              icon={<Percent className="h-4 w-4" />}
              description="Average discount given"
              color="purple"
            />
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>From button view to completed bargain</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <RechartsTooltip formatter={(value: any) => [`${value} sessions`, "Count"]} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter>
              <div className="grid grid-cols-4 w-full text-center text-sm">
                <div className="flex flex-col items-center">
                  <span className="font-medium text-blue-500">{analyticsData.conversionFunnel?.views || 0}</span>
                  <span className="text-xs text-muted-foreground">Views</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-medium text-green-500">{analyticsData.conversionFunnel?.clicks || 0}</span>
                  <span className="text-xs text-muted-foreground">Clicks</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-medium text-amber-500">{analyticsData.conversionFunnel?.chats || 0}</span>
                  <span className="text-xs text-muted-foreground">Chats</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-medium text-purple-500">
                    {analyticsData.conversionFunnel?.completions || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">Completions</span>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Device Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Sessions by device type</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {deviceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => [`${value} sessions`, "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No device data available</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {deviceData.map((device: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(device.name)}
                        <span className="text-xs">
                          {device.name}: {device.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bargaining Performance</CardTitle>
                <CardDescription>Key bargaining metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Avg. Negotiation Time</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      {analyticsData.kpi?.avg_duration
                        ? `${Math.floor(analyticsData.kpi.avg_duration / 60)}m ${Math.floor(analyticsData.kpi.avg_duration % 60)}s`
                        : "N/A"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Avg. Discount</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <Percent className="h-5 w-5 text-green-500" />
                      {analyticsData.kpi?.avg_discount ? `${analyticsData.kpi.avg_discount}%` : "N/A"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Button Clicks</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <MousePointer className="h-5 w-5 text-amber-500" />
                      {analyticsData.kpi?.button_clicks || 0}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Chats Started</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      {analyticsData.kpi?.chats_started || 0}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Conversion Rate</div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {analyticsData.kpi?.button_clicks && analyticsData.kpi?.bargains_completed
                        ? `${((analyticsData.kpi.bargains_completed / analyticsData.kpi.button_clicks) * 100).toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analyticsData.kpi?.bargains_completed || 0} of {analyticsData.kpi?.button_clicks || 0} clicks
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{
                        width:
                          analyticsData.kpi?.button_clicks && analyticsData.kpi?.bargains_completed
                            ? `${Math.min(100, (analyticsData.kpi.bargains_completed / analyticsData.kpi.button_clicks) * 100)}%`
                            : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Bargain Activity Over Time</CardTitle>
              <CardDescription>Daily bargain interactions</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {dailyTrendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff8042" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ff8042" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.1} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-md shadow-md p-2 text-sm">
                              <p className="font-medium">{label}</p>
                              <p className="text-[#8884d8]">{`Views: ${payload[0].value}`}</p>
                              <p className="text-[#82ca9d]">{`Clicks: ${payload[1].value}`}</p>
                              <p className="text-[#ffc658]">{`Sessions: ${payload[2].value}`}</p>
                              <p className="text-[#ff8042]">{`Conversions: ${payload[3].value}`}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorViews)"
                      name="Views"
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#82ca9d"
                      fillOpacity={1}
                      fill="url(#colorClicks)"
                      name="Clicks"
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="#ffc658"
                      fillOpacity={1}
                      fill="url(#colorSessions)"
                      name="Chat Sessions"
                    />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      stroke="#ff8042"
                      fillOpacity={1}
                      fill="url(#colorConversions)"
                      name="Conversions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No trend data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate Trend</CardTitle>
              <CardDescription>Daily conversion rate (Completions / Clicks)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {dailyTrendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyTrendsData.map((day) => ({
                      ...day,
                      conversionRate: day.clicks > 0 ? Number(((day.conversions / day.clicks) * 100).toFixed(1)) : 0,
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.1} />
                    <XAxis dataKey="date" />
                    <YAxis unit="%" />
                    <RechartsTooltip formatter={(value: any) => [`${value}%`, "Conversion Rate"]} />
                    <Line
                      type="monotone"
                      dataKey="conversionRate"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No conversion data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Products with most bargaining interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.topProducts && analyticsData.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.topProducts.map((product: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium truncate" title={product.product_title}>
                          {product.product_title || `Product ${product.product_id}`}
                        </div>
                        <Badge variant="outline">{product.total_interactions} interactions</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Clicks</div>
                          <div className="text-xl font-bold">{product.clicks}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Conversions</div>
                          <div className="text-xl font-bold">{product.conversions}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Avg. Discount</div>
                          <div className="text-xl font-bold">
                            {product.avg_discount ? `${product.avg_discount}%` : "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-1">Conversion Rate</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{
                              width:
                                product.clicks > 0
                                  ? `${Math.min(100, (product.conversions / product.clicks) * 100)}%`
                                  : "0%",
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span>0%</span>
                          <span>
                            {product.clicks > 0
                              ? `${((product.conversions / product.clicks) * 100).toFixed(1)}%`
                              : "0%"}
                          </span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No product data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bargaining Events</CardTitle>
              <CardDescription>Latest bargaining sessions and completions</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.recentEvents && analyticsData.recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.recentEvents.map((event: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium truncate" title={event.product_title}>
                            {event.product_title || "Unknown Product"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.event_timestamp), "MMM dd, yyyy HH:mm")}
                          </div>
                        </div>
                        <Badge variant={event.event_type === "bargain_completed" ? "success" : "default"}>
                          {event.event_type === "bargain_completed" ? "Completed" : "Started"}
                        </Badge>
                      </div>

                      {event.event_type === "bargain_completed" && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Initial Offer</div>
                            <div className="text-lg font-bold">
                              {event.initial_offer ? `$${Number.parseFloat(event.initial_offer).toFixed(2)}` : "N/A"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Final Price</div>
                            <div className="text-lg font-bold">
                              {event.final_price ? `$${Number.parseFloat(event.final_price).toFixed(2)}` : "N/A"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Discount</div>
                            <div className="text-lg font-bold">
                              {event.discount_percentage
                                ? `${Number.parseFloat(event.discount_percentage).toFixed(1)}%`
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      )}

                      {event.outcome && (
                        <div className="mt-2 flex justify-end">
                          <Badge variant="outline">{event.outcome}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent events available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <div className="text-xs text-muted-foreground flex items-center justify-end">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {format(lastUpdated, "MMM dd, yyyy HH:mm:ss")}
        </div>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description: string
  color: "blue" | "green" | "amber" | "emerald" | "purple"
}

function MetricCard({ title, value, icon, description, color }: MetricCardProps) {
  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
    green: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50",
    amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50",
    purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50",
  }

  const iconColorMap = {
    blue: "text-blue-500 dark:text-blue-400",
    green: "text-green-500 dark:text-green-400",
    amber: "text-amber-500 dark:text-amber-400",
    emerald: "text-emerald-500 dark:text-emerald-400",
    purple: "text-purple-500 dark:text-purple-400",
  }

  return (
    <Card className={`${colorMap[color]} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <div className={`${iconColorMap[color]} mr-2`}>{icon}</div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </div>
  )
}
