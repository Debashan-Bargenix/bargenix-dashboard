"use client"

import { useState, useEffect } from "react"

export function useAnimation(initialState = false, delay = 300) {
  const [isVisible, setIsVisible] = useState(initialState)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [isVisible, delay])

  const show = () => setIsVisible(true)
  const hide = () => setIsVisible(false)
  const toggle = () => setIsVisible((prev) => !prev)

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    toggle,
  }
}
