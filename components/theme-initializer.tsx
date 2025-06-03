"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeInitializer() {
  const { setTheme } = useTheme()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Fetch user preferences
        const response = await fetch("/api/user/preferences")
        if (response.ok) {
          const data = await response.json()
          if (data.theme) {
            setTheme(data.theme)
          }
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error)
      } finally {
        setIsInitialized(true)
      }
    }

    if (!isInitialized) {
      initializeTheme()
    }
  }, [setTheme, isInitialized])

  return null
}
