"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getUserNotifications, updateNotifications } from "@/app/actions/account-actions"
import { toast } from "@/hooks/use-toast"

interface NotificationsSectionProps {
  userId: number
}

export function NotificationsSection({ userId }: NotificationsSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    productUpdates: true,
    accountActivity: true,
  })

  useEffect(() => {
    async function loadNotifications() {
      try {
        const result = await getUserNotifications(userId)
        if (result) {
          setNotifications({
            emailNotifications: result.email_notifications,
            marketingEmails: result.marketing_emails,
            securityAlerts: result.security_alerts,
            productUpdates: result.product_updates,
            accountActivity: result.account_activity,
          })
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      Object.entries(notifications).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const result = await updateNotifications(formData)

      if (result.success) {
        toast({
          title: "Notifications updated",
          description: "Your notification preferences have been updated successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update notification preferences",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating notifications:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleToggle(key: keyof typeof notifications) {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications and updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Loading notification preferences...</p>
          </div>
        </CardContent>
      </Card>
    )
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
