"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, ExternalLink, Clock } from "lucide-react"

interface InventoryHeaderProps {
  storeName: string
  isConnected: boolean
  lastSynced: Date | string | null
  isSyncing: boolean
  onSync: () => Promise<void>
}

export function InventoryHeader({ storeName, isConnected, lastSynced, isSyncing, onSync }: InventoryHeaderProps) {
  const formattedLastSynced = lastSynced
    ? typeof lastSynced === "string"
      ? new Date(lastSynced).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
      : lastSynced.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
    : "Never synced"

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 mb-8 pb-6 border-b">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">Manage your products and bargaining settings</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
          <Clock className="h-3.5 w-3.5" />
          <span>Last synced: {formattedLastSynced}</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
            isConnected
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-amber-50 text-amber-700 border border-amber-100"
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="font-medium text-sm">{storeName}</span>
          <a
            href={`https://${storeName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <Button onClick={onSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 text-white">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          Sync Inventory
        </Button>
      </div>
    </div>
  )
}
