"use client"

import type React from "react"
import { useState, useEffect } from "react"
// Removed prepareShopifyAuth and deleteShopifyStoreData imports as they are server actions
// and this component should now redirect to /api/auth for connection.
// Deletion logic can remain if it's called directly via a server action elsewhere or refactored.
import { deleteShopifyStoreData } from "@/app/actions/shopify-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Store, Link2, AlertTriangle, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

interface ConnectShopifyProps {
  connectedStore: {
    id: string
    shop_name: string
    shop_domain: string
    status: string
  } | null
  success?: boolean
  error?: boolean
  message?: string
}

export default function ConnectShopify({ connectedStore, success, error, message }: ConnectShopifyProps) {
  const [shopInputValue, setShopInputValue] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (success && message) {
      toast({
        title: "Success",
        description: message,
        variant: "default",
      })
    } else if (error && message) {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    }
  }, [success, error, message, toast])

  const handleConnectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsConnecting(true)
    setConnectError(null)

    if (!shopInputValue.trim()) {
      setConnectError("Please enter your Shopify store URL (e.g., your-store.myshopify.com)")
      setIsConnecting(false)
      return
    }

    let shop = shopInputValue.trim()
    shop = shop.replace(/^https?:\/\//, "")
    shop = shop.replace(/\/$/, "")

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
      setConnectError("Invalid Shopify store URL. It should be in the format your-store.myshopify.com")
      setIsConnecting(false)
      return
    }

    console.log("Redirecting to backend for Shopify auth with shop:", shop)
    // Redirect to your app's backend /api/auth route
    window.location.href = `/api/auth?shop=${encodeURIComponent(shop)}`
  }

  const handleDeleteStore = async (storeId: string) => {
    setIsDeleting(true)
    try {
      // Assuming deleteShopifyStoreData is a server action that takes storeId
      // If it expects FormData, you'll need to adjust or create a new action
      const result = await deleteShopifyStoreData(storeId) // Pass storeId directly

      if (result.success) {
        toast({
          title: "Store Deleted",
          description: result.message,
          variant: "default",
        })
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete store. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      console.error("Error deleting store:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // If there's a connected store but it's inactive
  if (connectedStore && connectedStore.status !== "active") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Alert variant="destructive" className="bg-amber-50 text-amber-800 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Your Shopify store <strong>{connectedStore.shop_name}</strong> is disconnected. The app may have been
            uninstalled from your Shopify store.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-600" />
            <span className="font-medium">{connectedStore.shop_domain}</span>
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              Disconnected
            </Badge>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Store Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Store Data</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to completely delete this store's data from your dashboard? This action cannot
                  be undone.
                  <p className="mt-2 font-medium">
                    Note: This will only remove the store from your dashboard. It will not affect your Shopify store or
                    any installed apps.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteStore(connectedStore.id)} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="rounded-lg border p-4 bg-muted/20">
          <h3 className="font-medium mb-2">Reconnect Your Store</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To reconnect your store, you can either reinstall the app in your Shopify admin or connect your store again
            below.
          </p>
          <form onSubmit={handleConnectSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopUrlReconnect">Shopify Store URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shopUrlReconnect"
                  name="shopUrl"
                  placeholder="your-store.myshopify.com"
                  value={shopInputValue || connectedStore.shop_domain}
                  onChange={(e) => setShopInputValue(e.target.value)}
                  required
                  className="flex-1"
                  disabled={isConnecting}
                />
                <Button type="submit" disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Reconnect Store"}
                </Button>
              </div>
              {connectError && <p className="text-sm text-red-500">{connectError}</p>}
            </div>
          </form>
        </div>
      </motion.div>
    )
  }

  if (connectedStore && connectedStore.status === "active") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Your Shopify store <strong>{connectedStore.shop_name}</strong> is connected.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{connectedStore.shop_domain}</span>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/20">
          <h3 className="font-medium mb-2">What's Next?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Now that your store is connected, you can start adding bargaining features to your products. Navigate to
            Inventory or Chatbot settings to configure.
          </p>
          {/* Example button, adjust as needed */}
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/inventory">Go to Inventory</a>
          </Button>
        </div>
      </motion.div>
    )
  }

  // Default view: Connect new store
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {connectError && ( // Display general connect error if any
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{connectError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full mt-0.5">
              <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300">How to Connect Your Shopify Store</h3>
              <ol className="mt-2 text-sm space-y-2 text-blue-700 dark:text-blue-400">
                <li>1. Enter your Shopify store URL below (e.g., your-store.myshopify.com)</li>
                <li>2. Click "Connect Store" - you'll be redirected to Shopify to authorize our app</li>
                <li>3. After authorization, you'll be redirected back to this dashboard</li>
                <li>4. Your store will be connected and ready to use with bargaining features</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleConnectSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopUrlNew">Shopify Store URL</Label>
            <div className="flex gap-2">
              <Input
                id="shopUrlNew"
                name="shopUrl"
                placeholder="your-store.myshopify.com"
                value={shopInputValue}
                onChange={(e) => setShopInputValue(e.target.value)}
                required
                className="flex-1"
                disabled={isConnecting}
              />
              <Button type="submit" disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Store"}
              </Button>
            </div>
          </div>
        </form>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Required Permissions</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Our app requires the following permissions to enable bargaining features:
          </p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Read and modify products</li>
            <li>• Read orders</li>
            <li>• Read customer data</li>
            <li>• Read shop information</li>
            <li>• Read and write script tags</li>
            <li>• Read themes and theme content</li>
            {/* Add other scopes as defined in your SHOPIFY_SCOPES env var */}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
