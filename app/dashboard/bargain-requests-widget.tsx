"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { HandCoins, Clock, CheckCircle, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function BargainRequestsWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchBargainRequests()
  }, [])

  const fetchBargainRequests = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 900))
      setData({
        pending: 12,
        approved: 8,
        rejected: 3,
        recent: [
          { id: 1, product: "Premium Headphones", amount: "$25", status: "pending" },
          { id: 2, product: "Smart Watch", amount: "$40", status: "approved" },
          { id: 3, product: "Wireless Speaker", amount: "$15", status: "pending" },
        ],
      })
    } catch (error) {
      console.error("Error fetching bargain requests:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Bargain Requests" icon={<HandCoins className="h-5 w-5" />}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </DashboardCard>
    )
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

  return (
    <DashboardCard title="Bargain Requests" icon={<HandCoins className="h-5 w-5 text-purple-600" />} gradient="purple">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-amber-600">{data?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{data?.approved || 0}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{data?.rejected || 0}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Requests</h4>
          {data?.recent?.slice(0, 3).map((request: any) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-2 bg-white/30 dark:bg-gray-800/30 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{request.product}</p>
                <p className="text-xs text-muted-foreground">{request.amount} discount</p>
              </div>
              <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                <span className="flex items-center">
                  {getStatusIcon(request.status)}
                  <span className="ml-1 capitalize">{request.status}</span>
                </span>
              </Badge>
            </div>
          ))}
        </div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/dashboard/request-bargain">View All Requests</Link>
        </Button>
      </div>
    </DashboardCard>
  )
}
