"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useAuthRedirect(success: boolean, message: string) {
  const router = useRouter()

  useEffect(() => {
    if (success && message === "success") {
      // Add a small delay to allow the UI to update before redirecting
      const redirectTimer = setTimeout(() => {
        router.push("/dashboard")
      }, 500)

      return () => clearTimeout(redirectTimer)
    }
  }, [success, message, router])
}
