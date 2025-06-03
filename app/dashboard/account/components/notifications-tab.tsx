"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { AccountSkeleton } from "./account-skeleton"

interface NotificationsTabProps {
  userId: number
}

export function NotificationsTab({ userId }: NotificationsTabProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    productUpdates: true,
    accountActivity: true,
  })

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch(`/api/user/notifications?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setNotifications({
            emailNotifications: data.email_notifications ?? true,
            marketingEmails: data.marketing_emails ?? false,
            securityAlerts: data.security_alerts ?? true,
            productUpdates: data.product_updates ?? true,
            accountActivity: data.account_activity ?? true,
          })
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsFetching(false)
      }
    }

    if (userId) {
      fetchNotifications()
    } else {
      setIsFetching(false)
    }
  }, [userId])

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/notifications", {
        method: "POST",
        body: JSON.stringify(notifications),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update notification preferences")
      }

      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating notifications:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update notification preferences",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return <AccountSkeleton type="form" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Manage how you receive notifications and updates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={notifications.emailNotifications}
                onCheckedChange={() => handleToggle("emailNotifications")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketingEmails">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive marketing emails and promotions</p>
              </div>
              <Switch
                id="marketingEmails"
                checked={notifications.marketingEmails}
                onCheckedChange={() => handleToggle("marketingEmails")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="securityAlerts">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts about security updates and suspicious activity
                </p>
              </div>
              <Switch
                id="securityAlerts"
                checked={notifications.securityAlerts}
                onCheckedChange={() => handleToggle("securityAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="productUpdates">Product Updates</Label>
                <p className="text-sm text-muted-foreground">Receive updates about new features and improvements</p>
              </div>
              <Switch
                id="productUpdates"
                checked={notifications.productUpdates}
                onCheckedChange={() => handleToggle("productUpdates")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="accountActivity">Account Activity</Label>
                <p className="text-sm text-muted-foreground">Receive notifications about your account activity</p>
              </div>
              <Switch
                id="accountActivity"
                checked={notifications.accountActivity}
                onCheckedChange={() => handleToggle("accountActivity")}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
