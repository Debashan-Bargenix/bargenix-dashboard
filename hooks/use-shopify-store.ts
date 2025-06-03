"use client"

import { useState, useEffect } from "react"

interface UseShopifyStoreReturn {
  storeData: {
    id: number
    shop_domain: string
    shop_name: string
    currency: string
    access_token: string | null
    status: string
    [key: string]: any
  } | null
  storeCurrency: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShopifyStore(): UseShopifyStoreReturn {
  const [storeData, setStoreData] = useState<UseShopifyStoreReturn["storeData"]>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStoreData = async () => {
    try {
      setIsLoading(true)
      // This is using the server action without passing userId
      // The server action internally gets the current user
      const res = await fetch("/api/shopify/store-data")

      if (!res.ok) {
        throw new Error(`Failed to fetch store data: ${res.status}`)
      }

      const data = await res.json()

      if (data.success) {
        setStoreData(data.store)
      } else {
        setError(data.message || "Failed to fetch store data")
        setStoreData(null)
      }
    } catch (err) {
      console.error("Error fetching Shopify store:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setStoreData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStoreData()
  }, [])

  return {
    storeData,
    storeCurrency: storeData?.currency || null,
    isLoading,
    error,
    refetch: fetchStoreData,
  }
}
