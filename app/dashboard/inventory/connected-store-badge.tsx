"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ConnectedStoreBadgeProps {
  storeName: string
  isConnected: boolean
  lastSynced?: string | null
}

export function ConnectedStoreBadge({ storeName, isConnected, lastSynced }: ConnectedStoreBadgeProps) {
  if (!storeName) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 py-1.5 px-3 ${
              isConnected
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-amber-500 text-amber-700 bg-amber-50"
            }`}
          >
            {isConnected && <CheckCircle className="h-3.5 w-3.5" />}
            {storeName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
          {lastSynced && (
            <p className="text-xs text-muted-foreground">Last synced: {new Date(lastSynced).toLocaleString()}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
