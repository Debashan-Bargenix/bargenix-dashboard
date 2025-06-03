"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { AccountSkeleton } from "./account-skeleton"

interface ActivitySectionProps {
  userId: number
}

interface ActivityItem {
  id: number
  activity_type: string
  details: string
  ip_address: string
  created_at: string
}

export function ActivitySection({ userId }: ActivitySectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivity() {
      if (!userId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/user/activity?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setActivity(Array.isArray(data) ? data : [])
        } else {
          setError("Failed to load activity data")
        }
      } catch (error) {
        console.error("Error fetching activity:", error)
        setError("An error occurred while loading activity data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivity()
  }, [userId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent account activity and login history.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSkeleton type="activity" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent account activity and login history.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-4">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your recent account activity and login history.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent activity found.</p>
        ) : (
          <div className="space-y-4">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium">{formatActivityType(item.activity_type)}</p>
                  <p className="text-sm text-muted-foreground">{item.details}</p>
                </div>
                <div className="text-sm text-muted-foreground">{formatDate(item.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatActivityType(type: string): string {
  const types: Record<string, string> = {
    login: "Login",
    logout: "Logout",
    profile_update: "Profile Update",
    password_change: "Password Change",
    settings_change: "Settings Change",
  }

  return (
    types[type] ||
    type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}
