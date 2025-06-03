"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUserPreferences, updatePreferences } from "@/app/actions/account-actions"
import { toast } from "@/hooks/use-toast"

interface PreferencesSectionProps {
  userId: number
}

export function PreferencesSection({ userId }: PreferencesSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] = useState({
    theme: "system",
    language: "en",
    autoSave: true,
    compactView: false,
  })

  useEffect(() => {
    async function loadPreferences() {
      try {
        const result = await getUserPreferences(userId)
        if (result) {
          setPreferences({
            theme: result.theme || "system",
            language: result.language || "en",
            autoSave: result.auto_save,
            compactView: result.compact_view,
          })
        }
      } catch (error) {
        console.error("Error loading preferences:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      Object.entries(preferences).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const result = await updatePreferences(formData)

      if (result.success) {
        toast({
          title: "Preferences updated",
          description: "Your preferences have been updated successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update preferences",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleToggle(key: "autoSave" | "compactView") {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Preferences</CardTitle>
          <CardDescription>Customize your dashboard experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Loading preferences...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Preferences</CardTitle>
        <CardDescription>Customize your dashboard experience.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, language: value }))}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSave">Auto Save</Label>
                <p className="text-sm text-muted-foreground">Automatically save changes as you make them</p>
              </div>
              <Switch id="autoSave" checked={preferences.autoSave} onCheckedChange={() => handleToggle("autoSave")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compactView">Compact View</Label>
                <p className="text-sm text-muted-foreground">Use a more compact layout for the dashboard</p>
              </div>
              <Switch
                id="compactView"
                checked={preferences.compactView}
                onCheckedChange={() => handleToggle("compactView")}
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
