"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface SimpleNotificationsFormProps {
  userId: number
}

export function SimpleNotificationsForm({ userId }: SimpleNotificationsFormProps) {
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    productUpdates: true,
    accountActivity: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage("Notification preferences updated successfully")
    } catch (error) {
      console.error("Error updating notifications:", error)
      setMessage("Failed to update notification preferences")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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

      {message && (
        <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100" : "bg-red-100"}`}>{message}</div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
