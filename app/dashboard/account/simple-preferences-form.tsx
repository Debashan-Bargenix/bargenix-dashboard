"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"

interface SimplePreferencesFormProps {
  userId: number
}

export function SimplePreferencesForm({ userId }: SimplePreferencesFormProps) {
  const { theme, setTheme } = useTheme()
  const [language, setLanguage] = useState("en")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleThemeChange = (value: string) => {
    setTheme(value)
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save preferences to API
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          language,
        }),
      })

      if (response.ok) {
        toast({
          title: "Preferences updated",
          description: "Your preferences have been saved successfully.",
        })
      } else {
        throw new Error("Failed to update preferences")
      }
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              className="flex flex-col items-center justify-center gap-1 h-24 w-full"
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-5 w-5" />
              <span>Light</span>
            </Button>
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              className="flex flex-col items-center justify-center gap-1 h-24 w-full"
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="h-5 w-5" />
              <span>Dark</span>
            </Button>
            <Button
              type="button"
              variant={theme === "system" ? "default" : "outline"}
              className="flex flex-col items-center justify-center gap-1 h-24 w-full"
              onClick={() => handleThemeChange("system")}
            >
              <Monitor className="h-5 w-5" />
              <span>System</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Choose your preferred language for the dashboard interface.</p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
