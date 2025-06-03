"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, X } from "lucide-react"
import {
  installBargainButton,
  uninstallBargainButton,
  checkBargainButtonStatus,
} from "@/app/actions/bargain-button-actions"
import { useToast } from "@/hooks/use-toast"

interface BargainButtonInstallerProps {
  shopDomain: string
}

export function BargainButtonInstaller({ shopDomain }: BargainButtonInstallerProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [installed, setInstalled] = useState(false)
  const [scripts, setScripts] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (shopDomain) {
      checkStatus()
    } else {
      setChecking(false)
    }
  }, [shopDomain])

  const checkStatus = async () => {
    if (!shopDomain) {
      setChecking(false)
      return
    }

    setChecking(true)
    setError(null)
    try {
      const result = await checkBargainButtonStatus(shopDomain)
      setInstalled(result.installed)
      setScripts(result.scripts || [])
    } catch (error) {
      console.error("Error checking status:", error)
      setError("Failed to check installation status")
    } finally {
      setChecking(false)
    }
  }

  const handleInstall = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await installBargainButton(shopDomain)
      if (result.success) {
        toast({
          title: "Success",
          description: "Bargain button installed successfully",
        })
        setInstalled(true)
        await checkStatus()
      } else {
        setError(result.error || "Failed to install bargain button")
        toast({
          variant: "destructive",
          title: "Installation failed",
          description: result.error || "Failed to install bargain button",
        })
      }
    } catch (error) {
      console.error("Error installing:", error)
      setError("An unexpected error occurred during installation")
      toast({
        variant: "destructive",
        title: "Installation failed",
        description: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUninstall = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await uninstallBargainButton(shopDomain)
      if (result.success) {
        toast({
          title: "Success",
          description: "Bargain button uninstalled successfully",
        })
        setInstalled(false)
        await checkStatus()
      } else {
        setError(result.error || "Failed to uninstall bargain button")
        toast({
          variant: "destructive",
          title: "Uninstallation failed",
          description: result.error || "Failed to uninstall bargain button",
        })
      }
    } catch (error) {
      console.error("Error uninstalling:", error)
      setError("An unexpected error occurred during uninstallation")
      toast({
        variant: "destructive",
        title: "Uninstallation failed",
        description: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const dismissError = () => {
    setError(null)
  }

  if (!shopDomain) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Shopify store connected</AlertTitle>
        <AlertDescription>Please connect your Shopify store before installing the bargain button.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bargain Button Installation</CardTitle>
        <CardDescription>Install the bargain button on your Shopify store product pages</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={dismissError}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {checking ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking installation status...</span>
          </div>
        ) : installed ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Bargain button is installed</AlertTitle>
            <AlertDescription className="text-green-700">
              The bargain button is active on your product pages.
              {scripts.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Script details:</p>
                  <p className="text-xs mt-1">Source: {scripts[0].src}</p>
                  <p className="text-xs">Installed on: {new Date(scripts[0].created_at).toLocaleString()}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Script not installed</AlertTitle>
            <AlertDescription>
              The bargain button script is not currently installed on your Shopify store.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4">
          <p className="text-sm text-gray-600">
            The bargain button will appear on your product pages, allowing customers to initiate bargaining for products
            that have bargaining enabled in your inventory settings.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={checkStatus} disabled={checking || loading}>
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </>
          )}
        </Button>
        {installed ? (
          <Button variant="destructive" onClick={handleUninstall} disabled={checking || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uninstalling...
              </>
            ) : (
              "Uninstall Script"
            )}
          </Button>
        ) : (
          <Button onClick={handleInstall} disabled={checking || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              "Install Script"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
