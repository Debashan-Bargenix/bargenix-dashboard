"use client"

import { useState, useEffect } from "react"
import { getAccountActivity } from "@/app/actions/account-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, LogIn, Settings, UserCog, Lock } from "lucide-react"

interface ActivitySectionProps {
  userId: number
}

export function ActivitySection({ userId }: ActivitySectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [activity, setActivity] = useState<any[]>([])

  useEffect(() => {
    async function loadActivity() {
      try {
        const result = await getAccountActivity(userId)
        setActivity(result || [])
      } catch (error) {
        console.error("Error loading activity:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivity()
  }, [userId])

  if (isLoading) {
    return <p>Loading activity...</p>
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">No activity found</h3>
        <p className="text-sm text-muted-foreground mt-1">Your recent account activity will appear here.</p>
      </div>
    )
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4" />
      case "profile_update":
        return <UserCog className="h-4 w-4" />
      case "password_change":
        return <Lock className="h-4 w-4" />
      case "settings_change":
        return <Settings className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  function getActivityTitle(type: string) {
    switch (type) {
      case "login":
        return "Login"
      case "profile_update":
        return "Profile Update"
      case "password_change":
        return "Password Change"
      case "settings_change":
        return "Settings Change"
      default:
        return "Account Activity"
    }
  }

  return (
    <div className="space-y-4">
      {activity.map((item) => (
        <div key={item.id} className="flex items-start space-x-4">
          <Avatar className="h-9 w-9 bg-primary/10">
            <AvatarFallback className="text-primary">{getActivityIcon(item.activity_type)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium">{getActivityTitle(item.activity_type)}</p>
            <p className="text-sm text-muted-foreground">{item.details}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : "Unknown time"}
          </p>
        </div>
      ))}
    </div>
  )
}
