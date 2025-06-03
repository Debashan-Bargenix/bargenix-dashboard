"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ShoppingBag, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface ShopifyStatusWidgetProps {
  store: any
}

export function ShopifyStatusWidget({ store }: ShopifyStatusWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scriptStatus, setScriptStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (store?.shop_domain) {
      fetchScriptStatus()
    } else {
      setLoading(false)
    }
  }, [store])

  const fetchScriptStatus = async () => {
    if (!store?.shop_domain) {
      setError("No Shopify store connected")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/shopify/script-status?shopDomain=${encodeURIComponent(store.shop_domain)}`)

      if (!response.ok) {
        throw new Error("Failed to fetch script status")
      }

      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setScriptStatus(null)
      } else {
        setScriptStatus(result.data || null)
      }
    } catch (error) {
      console.error("Error fetching script status:", error)
      setError("Failed to load script status")
      setScriptStatus(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchScriptStatus()
  }

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[200px] w-full" />
    }

    if (!store) {
      return (
        <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Store Not Connected</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Connect your Shopify store to enable bargaining features.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/shopify">Connect Store</Link>
          </Button>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-base font-medium mb-2">Status Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{store.shop_domain}</span>
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span className="text-xs">Connected</span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Last Sync</span>
            <span className="text-muted-foreground">
              {store.last_sync_at ? new Date(store.last_sync_at).toLocaleString() : "Never"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Script Status</span>
            <div className="flex items-center">
              {scriptStatus?.installed ? (
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className="text-xs">{scriptStatus?.installed ? "Installed" : "Not Installed"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Access Token</span>
            <div className="flex items-center">
              {store.access_token ? (
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className="text-xs">{store.access_token ? "Valid" : "Invalid"}</span>
            </div>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/dashboard/shopify">Manage Integration</Link>
        </Button>
      </div>
    )
  }

  return (
    <DashboardCard
      title="Shopify Integration"
      icon={<ShoppingBag className="h-5 w-5 text-green-600" />}
      badge={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={loading || refreshing || !store}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      }
      gradient="green"
    >
      {renderContent()}
    </DashboardCard>
  )
}
