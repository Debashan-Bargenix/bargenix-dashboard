"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface SyncButtonProps {
  onSync: () => void
  isSyncing: boolean
  lastSynced?: string | null
}

export function SyncButton({ onSync, isSyncing }: SyncButtonProps) {
  return (
    <Button onClick={onSync} disabled={isSyncing} variant="outline" size="sm" className="h-9">
      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Inventory"}
    </Button>
  )
}
