"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// Define search result types
export type SearchResultCategory = "pages" | "settings" | "products" | "users"

export interface SearchResult {
  id: string
  title: string
  description: string
  url: string
  category: SearchResultCategory
  icon?: React.ReactNode
}

// Mock search data - in a real app, this would come from an API or database
const mockSearchData: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Main dashboard overview",
    url: "/dashboard",
    category: "pages",
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Manage your product inventory",
    url: "/dashboard/inventory",
    category: "pages",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "View sales and performance metrics",
    url: "/dashboard/analytics",
    category: "pages",
  },
  {
    id: "chatbot",
    title: "Chatbot",
    description: "Configure your store chatbot",
    url: "/dashboard/chatbot",
    category: "pages",
  },
  {
    id: "shopify",
    title: "Shopify",
    description: "Manage your Shopify integration",
    url: "/dashboard/shopify",
    category: "settings",
  },
  {
    id: "account",
    title: "Account Settings",
    description: "Manage your account preferences",
    url: "/dashboard/account",
    category: "settings",
  },
  {
    id: "memberships",
    title: "Memberships",
    description: "Manage your subscription plans",
    url: "/dashboard/memberships",
    category: "settings",
  },
  {
    id: "system",
    title: "System",
    description: "System health and maintenance",
    url: "/dashboard/system",
    category: "settings",
  },
]

export function useSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    setIsLoading(true)

    try {
      // In a real app, this would be an API call
      // For now, we'll just filter the mock data
      const filteredResults = mockSearchData.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100))

      setResults(filteredResults)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update search results when query changes
  useEffect(() => {
    if (query.trim() === "") {
      setResults([])
      return
    }

    const debounceTimer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, search])

  // Navigate to selected result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      router.push(result.url)
      setQuery("")
      setResults([])
    },
    [router],
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return

      // Arrow down
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
      }

      // Arrow up
      else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      }

      // Enter to navigate
      else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault()
        navigateToResult(results[selectedIndex])
      }
    },
    [results, selectedIndex, navigateToResult],
  )

  return {
    query,
    setQuery,
    results,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    navigateToResult,
  }
}
