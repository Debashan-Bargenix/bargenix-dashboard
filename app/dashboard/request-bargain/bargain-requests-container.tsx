"use client"

import { useState, useEffect } from "react"
import { BargainRequestsTable } from "./bargain-requests-table"
import { BargainRequestStats } from "./bargain-request-stats"
import { DebugTools } from "./debug-tools"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, RefreshCw, AlertCircle } from "lucide-react"
import {
  getBargainRequests,
  type BargainRequest,
  getShopifyProductDetails,
  updateBargainRequestStatus,
  checkBargainingStatus,
} from "@/app/actions/bargain-request-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function BargainRequestsContainer() {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [requests, setRequests] = useState<BargainRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BargainRequest | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [productDetails, setProductDetails] = useState<any>(null)
  const [bargainingStatus, setBargainingStatus] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = async () => {
    if (isRefreshing) return

    setIsLoading(true)
    setError(null)
    try {
      const fetchedRequests = await getBargainRequests()
      console.log("Fetched requests:", fetchedRequests)
      setRequests(fetchedRequests)
    } catch (error) {
      console.error("Error fetching bargain requests:", error)
      setError("Failed to load bargain requests. Please check your database connection.")
      toast({
        title: "Error",
        description: "Failed to load bargain requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchRequests()
      toast({
        title: "Refreshed",
        description: "Bargain requests have been refreshed",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleViewDetails = async (request: BargainRequest) => {
    setSelectedRequest(request)
    setDetailsOpen(true)
    setIsLoadingDetails(true)
    setProductDetails(null)
    setBargainingStatus(null)

    try {
      const details = await getShopifyProductDetails(request.shop_domain, request.product_id, request.variant_id)
      setProductDetails(details)

      const status = await checkBargainingStatus(request.product_id, request.variant_id)
      setBargainingStatus(status)
    } catch (error) {
      console.error("Error loading details:", error)
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleReject = async (request: BargainRequest) => {
    try {
      const result = await updateBargainRequestStatus(request.id, "rejected")
      if (result.success) {
        toast({
          title: "Request rejected",
          description: "The bargain request has been rejected",
        })
        fetchRequests()
      } else {
        throw new Error(result.error || "Failed to reject request")
      }
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject the request",
        variant: "destructive",
      })
    }
  }

  const handleComplete = async (request: BargainRequest) => {
    try {
      const result = await updateBargainRequestStatus(request.id, "completed")
      if (result.success) {
        toast({
          title: "Request completed",
          description: "The bargain request has been marked as completed",
        })
        fetchRequests()
      } else {
        throw new Error(result.error || "Failed to complete request")
      }
    } catch (error) {
      console.error("Error completing request:", error)
      toast({
        title: "Error",
        description: "Failed to complete the request",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  return (
    <div className="space-y-6">
      {/* Debug Tools (only in development) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="border border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-3 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Debug Tools (Development Only)
          </h3>
          <DebugTools onRefresh={fetchRequests} />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {!isLoading && <BargainRequestStats requests={requests} />}

      {/* All Requests */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Bargain Requests</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <div className="border rounded-md flex">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderContent(requests)}</TabsContent>

          <TabsContent value="pending">{renderContent(requests.filter((r) => r.status === "pending"))}</TabsContent>

          <TabsContent value="approved">{renderContent(requests.filter((r) => r.status === "approved"))}</TabsContent>

          <TabsContent value="rejected">{renderContent(requests.filter((r) => r.status === "rejected"))}</TabsContent>

          <TabsContent value="completed">{renderContent(requests.filter((r) => r.status === "completed"))}</TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bargain Request Details</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            selectedRequest && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Request ID:</span>
                  <span className="col-span-3">{selectedRequest.id}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Product:</span>
                  <span className="col-span-3">{selectedRequest.product_title || "Unknown Product"}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Shop:</span>
                  <span className="col-span-3">{selectedRequest.shop_domain}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="col-span-3">
                    {selectedRequest.product_price
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(selectedRequest.product_price)
                      : "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Customer:</span>
                  <span className="col-span-3">{selectedRequest.customer_email || "Anonymous"}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="col-span-3 capitalize">{selectedRequest.status}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Requested:</span>
                  <span className="col-span-3">
                    {new Date(selectedRequest.created_at || selectedRequest.request_date || "").toLocaleString()}
                  </span>
                </div>
                {selectedRequest.notes && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <span className="text-sm font-medium">Notes:</span>
                    <span className="col-span-3">{selectedRequest.notes}</span>
                  </div>
                )}

                {productDetails && (
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-medium mb-2">Product Details</h4>
                    <div className="grid grid-cols-[100px_1fr] gap-4">
                      <div>
                        {productDetails.image_url ? (
                          <img
                            src={productDetails.image_url || "/placeholder.svg"}
                            alt={productDetails.title || "Product"}
                            className="w-full h-auto rounded-md"
                          />
                        ) : (
                          <div className="w-full h-[100px] bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">{productDetails.title}</h3>
                        <div className="flex gap-2">
                          <span className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(productDetails.price || 0))}
                          </span>
                          {productDetails.compare_at_price && (
                            <span className="line-through text-muted-foreground">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(Number(productDetails.compare_at_price || 0))}
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Inventory: </span>
                          <span>{productDetails.inventory_quantity} in stock</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {bargainingStatus && (
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-medium mb-2">Bargaining Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <span>{bargainingStatus.enabled ? "Enabled" : "Disabled"}</span>
                      </div>
                      {bargainingStatus.enabled && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Min Price:</span>
                            <span>
                              {bargainingStatus.minPrice
                                ? new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(bargainingStatus.minPrice)
                                : "Not set"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Behavior:</span>
                            <span className="capitalize">{bargainingStatus.behavior}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderContent(filteredRequests: BargainRequest[]) {
    if (isLoading) {
      return <Skeleton className="h-[400px] w-full" />
    }

    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No requests found</p>
          {process.env.NODE_ENV !== "production" && (
            <p className="text-sm text-muted-foreground mt-2">Use the debug tools above to create test requests</p>
          )}
        </div>
      )
    }

    return viewMode === "table" ? (
      <BargainRequestsTable requests={filteredRequests} onRefresh={fetchRequests} />
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => (
          <div key={request.id} className="border rounded-md p-4">
            <div className="flex justify-between">
              <h3 className="font-medium truncate">{request.product_title || "Unknown Product"}</h3>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">{request.status}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Shop: {request.shop_domain}</p>
              <p>
                Price:{" "}
                {request.product_price
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(request.product_price)
                  : "N/A"}
              </p>
              <p>Customer: {request.customer_email || "Anonymous"}</p>
              <p>
                Requested:{" "}
                {new Date(request.created_at || request.request_date || "").toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleViewDetails(request)}>
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }
}
