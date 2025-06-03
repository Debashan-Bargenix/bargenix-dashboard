"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface NotificationsFormProps {
  userId: number
  notifications: any
}

export function NotificationsForm({ userId, notifications }: NotificationsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    emailNotifications: notifications?.email_notifications ?? true,
    marketingEmails: notifications?.marketing_emails ?? false,
    securityAlerts: notifications?.security_alerts ?? true,
    productUpdates: notifications?.product_updates ?? true,
    accountActivity: notifications?.account_activity ?? true,
  })
  const { toast } = useToast()

  const handleChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(false)
    setError("")

    try {
      const response = await fetch("/api/user/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast({
          title: "Notifications Updated",
          description: "Your notification preferences have been updated successfully.",
          variant: "default",
        })
      } else {
        setError(data.message || "Failed to update notification preferences")
      }
    } catch (err) {
      setError("An error occurred while updating your notification preferences")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Notification preferences updated successfully</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emailNotifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive email notifications about your account activity.</p>
          </div>
          <Switch
            id="emailNotifications"
            checked={formData.emailNotifications}
            onCheckedChange={(checked) => handleChange("emailNotifications", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="marketingEmails">Marketing Emails</Label>
            <p className="text-sm text-muted-foreground">Receive emails about new features, promotions, and updates.</p>
          </div>
          <Switch
            id="marketingEmails"
            checked={formData.marketingEmails}
            onCheckedChange={(checked) => handleChange("marketingEmails", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="securityAlerts">Security Alerts</Label>
            <p className="text-sm text-muted-foreground">Receive emails about security updates and unusual activity.</p>
          </div>
          <Switch
            id="securityAlerts"
            checked={formData.securityAlerts}
            onCheckedChange={(checked) => handleChange("securityAlerts", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="productUpdates">Product Updates</Label>
            <p className="text-sm text-muted-foreground">Receive emails about product updates and new features.</p>
          </div>
          <Switch
            id="productUpdates"
            checked={formData.productUpdates}
            onCheckedChange={(checked) => handleChange("productUpdates", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="accountActivity">Account Activity</Label>
            <p className="text-sm text-muted-foreground">Receive emails about your account activity and changes.</p>
          </div>
          <Switch
            id="accountActivity"
            checked={formData.accountActivity}
            onCheckedChange={(checked) => handleChange("accountActivity", checked)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  )
}
