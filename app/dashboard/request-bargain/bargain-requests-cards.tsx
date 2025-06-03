"use client"

import { useState } from "react"
import {
  type BargainRequest,
  getShopifyProductDetails,
  type ShopifyProductDetails,
  approveBargainRequest,
  updateBargainRequestStatus,
  checkBargainingStatus,
} from "@/app/actions/bargain-request-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, ShoppingCart, ExternalLink, Eye, MoreHorizontal, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface BargainRequestsCardsProps {
  requests: BargainRequest[]
  onRefresh: () => void
}

export function BargainRequestsCards({ requests, onRefresh }: BargainRequestsCardsProps) {
  const { toast } = useToast()
  const [expandedProductDetails, setExpandedProductDetails] = useState<
    Record<number, ShopifyProductDetails | null | "loading">
  >({})
  const [isApproving, setIsApproving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BargainRequest | null>(null)
  const [approvalSettings, setApprovalSettings] = useState({
    minPrice: 0,
    behavior: "normal",
    notes: "",
  })
  const [bargainingStatus, setBargainingStatus] = useState<{
    enabled: boolean
    minPrice: number | null
    behavior: string
  } | null>(null)

  // Function to load product details
  const loadProductDetails = async (request: BargainRequest) => {
    if (expandedProductDetails[request.id] === "loading") return

    setExpandedProductDetails((prev) => ({ ...prev, [request.id]: "loading" }))

    try {
      const details = await getShopifyProductDetails(request.shop_domain, request.product_id, request.variant_id)
      setExpandedProductDetails((prev) => ({ ...prev, [request.id]: details }))

      // Check if bargaining is already enabled for this product
      const status = await checkBargainingStatus(request.product_id, request.variant_id)
      setBargainingStatus(status)

      // Set default min price to 80% of product price if not already set
      if (details && details.price) {
        const productPrice = Number.parseFloat(details.price)
        setApprovalSettings((prev) => ({
          ...prev,
          minPrice: status.minPrice || Math.round(productPrice * 0.8 * 100) / 100,
        }))
      }
    } catch (error) {
      console.error("Error loading product details:", error)
      setExpandedProductDetails((prev) => ({ ...prev, [request.id]: null }))
    }
  }

  // Function to handle approval
  const handleApprove = async (request: BargainRequest) => {
    setSelectedRequest(request)
    await loadProductDetails(request)
    // Dialog will open
  }

  // Function to submit approval
  const submitApproval = async () => {
    if (!selectedRequest) return

    setIsApproving(true)
    try {
      const productDetails = expandedProductDetails[selectedRequest.id]
      if (productDetails === "loading" || !productDetails) {
        throw new Error("Product details not loaded")
      }

      const originalPrice = Number.parseFloat(productDetails.price)
      const result = await approveBargainRequest(
        selectedRequest.id,
        approvalSettings.minPrice,
        originalPrice,
        approvalSettings.behavior,
        approvalSettings.notes,
      )

      if (result.success) {
        toast({
          title: "Request approved",
          description: "Bargaining has been enabled for this product",
        })
        onRefresh()
      } else {
        throw new Error(result.error || "Failed to approve request")
      }
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve request",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
      setSelectedRequest(null)
    }
  }

  // Function to update status (reject or complete)
  const handleStatusUpdate = async (
    requestId: number,
    status: "pending" | "approved" | "rejected" | "completed",
    notes?: string,
  ) => {
    setIsUpdatingStatus(true)
    try {
      const result = await updateBargainRequestStatus(requestId, status, notes)
      if (result.success) {
        toast({
          title: `Request ${status}`,
          description: `The bargain request has been marked as ${status}`,
        })
        onRefresh()
      } else {
        throw new Error(result.error || `Failed to mark request as ${status}`)
      }
    } catch (error) {
      console.error(`Error updating request status to ${status}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to update request status`,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: BargainRequest["status"] }) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <ShoppingCart className="h-3 w-3 mr-1" /> Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-8 text-muted-foreground">
            No bargain requests found
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg truncate max-w-[200px]">
                      {request.product_title || "Unknown Product"}
                    </CardTitle>
                    <CardDescription>{request.shop_domain}</CardDescription>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="font-medium">
                      {request.product_price
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(request.product_price)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Customer:</span>
                    <span>{request.customer_email || "Anonymous"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requested:</span>
                    <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{request.id}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => loadProductDetails(request)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Bargain Request Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Request ID:</span>
                        <span className="col-span-3">{request.id}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Product:</span>
                        <span className="col-span-3">{request.product_title || "Unknown Product"}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Shop:</span>
                        <span className="col-span-3">{request.shop_domain}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Product ID:</span>
                        <span className="col-span-3">{request.product_id}</span>
                      </div>
                      {request.variant_id && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <span className="text-sm font-medium">Variant ID:</span>
                          <span className="col-span-3">{request.variant_id}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Price:</span>
                        <span className="col-span-3">
                          {request.product_price
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(request.product_price)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Customer:</span>
                        <span className="col-span-3">{request.customer_email || "Anonymous"}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Status:</span>
                        <span className="col-span-3">
                          <StatusBadge status={request.status} />
                        </span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-sm font-medium">Requested:</span>
                        <span className="col-span-3">{new Date(request.created_at).toLocaleString()}</span>
                      </div>

                      <div className="border-t pt-4 mt-2">
                        <h4 className="font-medium mb-2">Product Details from Shopify</h4>
                        {expandedProductDetails[request.id] === "loading" ? (
                          <div className="space-y-2">
                            <Skeleton className="h-[100px] w-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                          </div>
                        ) : expandedProductDetails[request.id] ? (
                          <div className="grid grid-cols-[100px_1fr] gap-4">
                            <div>
                              {expandedProductDetails[request.id]?.image_url ? (
                                <img
                                  src={expandedProductDetails[request.id]?.image_url || ""}
                                  alt={expandedProductDetails[request.id]?.title || "Product"}
                                  className="w-full h-auto rounded-md"
                                />
                              ) : (
                                <div className="w-full h-[100px] bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-medium">{expandedProductDetails[request.id]?.title}</h3>
                              <div className="flex gap-2">
                                <span className="font-medium">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(Number(expandedProductDetails[request.id]?.price || 0))}
                                </span>
                                {expandedProductDetails[request.id]?.compare_at_price && (
                                  <span className="line-through text-muted-foreground">
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    }).format(Number(expandedProductDetails[request.id]?.compare_at_price || 0))}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Inventory: </span>
                                <span>{expandedProductDetails[request.id]?.inventory_quantity} in stock</span>
                              </div>
                              {expandedProductDetails[request.id]?.sku && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">SKU: </span>
                                  <span>{expandedProductDetails[request.id]?.sku}</span>
                                </div>
                              )}
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      `https://${request.shop_domain}/admin/products/${request.product_id}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View in Shopify
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">
                            Failed to load product details. The product may have been deleted or is no longer available.
                          </div>
                        )}
                      </div>

                      {bargainingStatus && (
                        <div className="border-t pt-4 mt-2">
                          <h4 className="font-medium mb-2">Bargaining Status</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            {bargainingStatus.enabled ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          {bargainingStatus.enabled && (
                            <>
                              <div className="flex items-center gap-2 mt-2">
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
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm font-medium">Behavior:</span>
                                <span className="capitalize">{bargainingStatus.behavior}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleApprove(request)}
                      disabled={request.status === "approved" || isUpdatingStatus}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(request.id, "rejected")}
                      disabled={request.status === "rejected" || isUpdatingStatus}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(request.id, "completed")}
                      disabled={request.status === "completed" || isUpdatingStatus}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(`https://${request.shop_domain}/admin/products/${request.product_id}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in Shopify
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Bargain Request</DialogTitle>
            <DialogDescription>
              Enable bargaining for this product and set the minimum acceptable price.
            </DialogDescription>
          </DialogHeader>

          {bargainingStatus?.enabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Bargaining already enabled</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This product already has bargaining enabled with a minimum price of{" "}
                  {bargainingStatus.minPrice
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(bargainingStatus.minPrice)
                    : "not set"}
                  . Your changes will update the existing settings.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="min-price" className="text-right">
                Min Price
              </Label>
              <div className="col-span-3">
                <Input
                  id="min-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={approvalSettings.minPrice}
                  onChange={(e) =>
                    setApprovalSettings((prev) => ({ ...prev, minPrice: Number.parseFloat(e.target.value) || 0 }))
                  }
                  className="col-span-3"
                />
                {expandedProductDetails[selectedRequest?.id || 0] &&
                  expandedProductDetails[selectedRequest?.id || 0] !== "loading" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Original price:{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(
                        Number.parseFloat(
                          (expandedProductDetails[selectedRequest?.id || 0] as ShopifyProductDetails)?.price || "0",
                        ),
                      )}
                    </p>
                  )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="behavior" className="text-right">
                Behavior
              </Label>
              <Select
                value={approvalSettings.behavior}
                onValueChange={(value) => setApprovalSettings((prev) => ({ ...prev, behavior: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select behavior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this approval"
                value={approvalSettings.notes}
                onChange={(e) => setApprovalSettings((prev) => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button onClick={submitApproval} disabled={isApproving}>
              {isApproving ? "Approving..." : "Approve & Enable Bargaining"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
