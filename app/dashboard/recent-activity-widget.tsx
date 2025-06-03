"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Activity, User, Package, MessageSquare, Settings } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function RecentActivityWidget() {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 600))
      setActivities([
        {
          id: 1,
          type: "bargain_request",
          description: "New bargain request for Premium Headphones",
          time: "2 minutes ago",
          icon: "message",
        },
        {
          id: 2,
          type: "product_sync",
          description: "Synced 5 new products from Shopify",
          time: "15 minutes ago",
          icon: "package",
        },
        {
          id: 3,
          type: "user_login",
          description: "Customer logged in via chatbot",
          time: "1 hour ago",
          icon: "user",
        },
        {
          id: 4,
          type: "settings_update",
          description: "Updated bargain button settings",
          time: "2 hours ago",
          icon: "settings",
        },
        {
          id: 5,
          type: "bargain_approved",
          description: "Approved bargain for Smart Watch Pro",
          time: "3 hours ago",
          icon: "message",
        },
      ])
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case "message":
        return <MessageSquare className="h-3 w-3" />
      case "package":
        return <Package className="h-3 w-3" />
      case "user":
        return <User className="h-3 w-3" />
      case "settings":
        return <Settings className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "bargain_request":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      case "product_sync":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      case "user_login":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      case "settings_update":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      case "bargain_approved":
        return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Recent Activity" icon={<Activity className="h-5 w-5" />}>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Recent Activity" icon={<Activity className="h-5 w-5 text-green-600" />} gradient="green">
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight">{activity.description}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}

        <Button asChild size="sm" variant="outline" className="w-full mt-4">
          <Link href="/dashboard/account">View All Activity</Link>
        </Button>
      </div>
    </DashboardCard>
  )
}
