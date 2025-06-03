"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useLanguage, type Language } from "@/providers/language-provider"
import { toast } from "@/hooks/use-toast"

export function usePreferences() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from API on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences")
        if (response.ok) {
          const data = await response.json()
          if (data.theme) setTheme(data.theme)
          if (data.language) setLanguage(data.language as Language)
        }
      } catch (error) {
        console.error("Failed to load preferences:", error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadPreferences()
  }, [setTheme, setLanguage])

  // Save preferences to API
  const savePreferences = async () => {
    setIsSaving(true)
    try {
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
          title: "Preferences saved",
          description: "Your preferences have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save preferences")
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return {
    theme,
    setTheme,
    language,
    setLanguage,
    savePreferences,
    isSaving,
    isLoaded,
  }
}
