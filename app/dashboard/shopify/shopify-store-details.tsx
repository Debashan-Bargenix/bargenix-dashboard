"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirectToShopifyApps, refreshShopifyStoreData } from "@/app/actions/shopify-actions"
import { useToast } from "@/hooks/use-toast"
import { ExternalLink, RefreshCw, LogOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { uninstallApp } from "@/app/actions/uninstall-actions"

export default function ShopifyStoreDetails({ connectedStore }: { connectedStore: any }) {
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUninstalling, setIsUninstalling] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showUninstallDialog, setShowUninstallDialog] = useState(false)
  const [uninstallStep, setUninstallStep] = useState(1)
  const [uninstallComplete, setUninstallComplete] = useState(false)

  if (!connectedStore) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Store Details</CardTitle>
          <CardDescription className="dark:text-slate-400">No Shopify store connected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-slate-400">Connect a Shopify store to view details.</p>
        </CardContent>
      </Card>
    )
  }

  const handleRefreshStore = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshShopifyStoreData(connectedStore.id)
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        // Force a page refresh to show updated data
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh store data",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRedirectToShopify = async () => {
    setIsRedirecting(true)
    try {
      const formData = new FormData()
      formData.append("storeId", connectedStore.id.toString())
      const result = await redirectToShopifyApps(formData)
      if (result.success && result.redirectUrl) {
        // Update uninstall step before redirecting
        setUninstallStep(2)
        // Store the uninstall attempt in the database
        await uninstallApp(connectedStore.id, "uninstall_initiated")
        // Redirect to Shopify
        window.location.href = result.redirectUrl
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
        setIsRedirecting(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redirect to Shopify",
        variant: "destructive",
      })
      setIsRedirecting(false)
    }
  }

  const startUninstallProcess = () => {
    setShowUninstallDialog(true)
    setUninstallStep(1)
  }

  const completeUninstallProcess = async () => {
    setIsUninstalling(true)
    try {
      // Record the uninstall completion in our database
      const result = await uninstallApp(connectedStore.id, "uninstall_completed")
      if (result.success) {
        setUninstallComplete(true)
        setUninstallStep(3)
        toast({
          title: "Success",
          description: "App uninstalled successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to complete uninstall process",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during the uninstall process",
        variant: "destructive",
      })
    } finally {
      setIsUninstalling(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-bold dark:text-slate-100">{connectedStore.shop_domain}</CardTitle>
            <CardDescription>
              {connectedStore.status === "active" && connectedStore.access_token ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">Disconnected</span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStore}
            disabled={isRefreshing}
            className="ml-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4 dark:text-slate-100">Store Information</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Store Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.shop_name || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Domain</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">{connectedStore.shop_domain}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.email || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Owner</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.owner_name || "Not available"}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4 dark:text-slate-100">Store Settings</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Currency</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.currency || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Country</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.country || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Timezone</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {connectedStore.timezone || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Connected</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-slate-300">
                    {new Date(connectedStore.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
        {(connectedStore.status !== "active" || !connectedStore.access_token) && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Store Disconnected</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    Your Shopify store appears to be disconnected. This usually happens when the app is uninstalled from
                    Shopify. Please go to the "Connect Store" tab to reconnect your store.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <CardFooter className="flex justify-between pt-4 border-t dark:border-slate-700">
          <Button
            variant="destructive"
            onClick={startUninstallProcess}
            disabled={isUninstalling}
            className="dark:bg-red-600 dark:hover:bg-red-700 dark:text-white"
          >
            {isUninstalling ? (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Uninstalling...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Uninstall App
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleRedirectToShopify}
            disabled={isRedirecting}
            className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isRedirecting ? (
              "Redirecting..."
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage in Shopify
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Uninstall Dialog */}
      <Dialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">
              {uninstallStep === 1 && "Uninstall Bargenix App"}
              {uninstallStep === 2 && "Uninstall in Progress"}
              {uninstallStep === 3 && "Uninstall Complete"}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {uninstallStep === 1 && "Follow these steps to uninstall the Bargenix app from your Shopify store."}
              {uninstallStep === 2 && "Please complete the uninstall process in Shopify."}
              {uninstallStep === 3 && "The app has been successfully uninstalled from your store."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {uninstallStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium dark:text-slate-200">Click "Continue to Shopify"</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      You'll be redirected to your Shopify admin to complete the uninstallation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium dark:text-slate-200">Find Bargenix in your installed apps</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      In the Shopify admin, locate Bargenix in your list of installed apps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium dark:text-slate-200">Click "Delete" and confirm</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Click the "Delete" button next to Bargenix and confirm the uninstallation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium dark:text-slate-200">Return to Bargenix dashboard</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      After uninstalling, return here and click "I've Completed Uninstall".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {uninstallStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Please complete the uninstall process in Shopify, then return here and click "I've Completed
                        Uninstall" below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <img
                    src="/placeholder.svg?key=p05f0"
                    alt="Shopify uninstall app screen"
                    className="rounded-md border border-gray-200 dark:border-slate-700"
                  />
                </div>
              </div>
            )}

            {uninstallStep === 3 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  The Bargenix app has been successfully uninstalled from your Shopify store. All bargaining features
                  have been removed from your store.
                </p>
                <p className="text-sm font-medium dark:text-slate-300">
                  You can reinstall the app at any time by clicking "Connect Store" in the dashboard.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            {uninstallStep === 1 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowUninstallDialog(false)}
                  className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRedirectToShopify}
                  disabled={isRedirecting}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                >
                  {isRedirecting ? "Redirecting..." : "Continue to Shopify"}
                </Button>
              </>
            )}

            {uninstallStep === 2 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowUninstallDialog(false)}
                  className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={completeUninstallProcess}
                  disabled={isUninstalling}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                >
                  {isUninstalling ? "Processing..." : "I've Completed Uninstall"}
                </Button>
              </>
            )}

            {uninstallStep === 3 && (
              <Button
                onClick={() => window.location.reload()}
                className="w-full dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
              >
                Return to Dashboard
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
