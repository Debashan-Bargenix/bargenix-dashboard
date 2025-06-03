"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, HandCoins, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface BargainRequestsWidgetProps {
  requests: any[]
}

export function BargainRequestsWidget({ requests }: BargainRequestsWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requests) {
      processRequestData(requests)
    }
  }, [requests])

  const processRequestData = (requestsData: any[]) => {
    if (!requestsData || requestsData.length === 0) {
      setData({
        pending: 0,
        approved: 0,
        rejected: 0,
        recent: [],
      })
      return
    }

    const pending = requestsData.filter((r) => r.status === "pending").length
    const approved = requestsData.filter((r) => r.status === "approved").length
    const rejected = requestsData.filter((r) => r.status === "rejected").length

    // Sort by created_at desc and take the first 3
    const recent = [...requestsData]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)

    setData({
      pending,
      approved,
      rejected,
      recent,
    })
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const response = await fetch("/api/bargain/requests")

      if (!response.ok) {
        throw new Error("Failed to fetch bargain requests")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        processRequestData(result.data || [])
      }
    } catch (error) {
      console.error("Error refreshing bargain requests:", error)
      setError("Failed to refresh bargain requests")
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-amber-500" />
      case "approved":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "rejected":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[250px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Request Data Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    if (!data) {
      return <Skeleton className="h-[250px] w-full" />
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-amber-600">{data.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{data.approved}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{data.rejected}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Requests</h4>
          {data.recent.length > 0 ? (
            data.recent.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 bg-white/30 dark:bg-gray-800/30 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{request.product_title || "Unknown Product"}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.discount_amount ? `$${request.discount_amount} discount` : "Custom request"}
                  </p>
                </div>
                <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                  <span className="flex items-center">
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </span>
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-2 text-sm text-muted-foreground">No recent bargain requests</div>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/dashboard/request-bargain">View All Requests</Link>
        </Button>
      </div>
    )
  }

  return (
    <DashboardCard
      title="Bargain Requests"
      icon={<HandCoins className="h-5 w-5 text-purple-600" />}
      badge={
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="h-8 w-8">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      }
      gradient="purple"
    >
      {renderContent()}
    </DashboardCard>
  )
}
