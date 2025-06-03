"use client"

import { useEffect, useState } from "react"
import { useTheme as useNextTheme } from "next-themes"

export function useTheme() {
  const { theme, setTheme, resolvedTheme, themes, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  const saveThemePreference = async (newTheme: string) => {
    try {
      setTheme(newTheme)

      // Save to API
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: newTheme,
        }),
      })

      return true
    } catch (error) {
      console.error("Failed to save theme preference:", error)
      return false
    }
  }

  return {
    theme: mounted ? theme : undefined,
    setTheme: saveThemePreference,
    resolvedTheme: mounted ? resolvedTheme : undefined,
    themes,
    systemTheme,
    mounted,
  }
}
