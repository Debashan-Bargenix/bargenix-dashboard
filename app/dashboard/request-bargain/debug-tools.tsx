"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createTestBargainRequest } from "@/app/actions/bargain-request-actions"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Plus, RefreshCw } from "lucide-react"

interface DebugToolsProps {
  onRefresh: () => void
}

export function DebugTools({ onRefresh }: DebugToolsProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateTestRequest = async () => {
    setIsCreating(true)
    try {
      const result = await createTestBargainRequest()
      if (result.success) {
        toast({
          title: "Success",
          description: `${result.message} (ID: ${result.id})`,
        })
        onRefresh()
      } else {
        throw new Error(result.error || "Failed to create test request")
      }
    } catch (error) {
      console.error("Error creating test request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create test request",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateTestRequest}
        disabled={isCreating}
        className="gap-1 bg-white dark:bg-gray-800"
      >
        {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create Test Request
      </Button>
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1 bg-white dark:bg-gray-800">
        <RefreshCw className="h-4 w-4" />
        Refresh Data
      </Button>
      <div className="flex items-center text-xs text-yellow-800 dark:text-yellow-300 ml-2">
        <AlertCircle className="h-3 w-3 mr-1" />
        These tools are only visible in development mode
      </div>
    </div>
  )
}
