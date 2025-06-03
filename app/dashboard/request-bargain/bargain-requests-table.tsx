"use client"

import { useState } from "react"
import {
  type BargainRequest,
  getShopifyProductDetails,
  updateBargainRequestStatus,
  checkBargainingStatus,
} from "@/app/actions/bargain-request-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, ExternalLink, Eye, MoreHorizontal } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface BargainRequestsTableProps {
  requests: BargainRequest[]
  onRefresh: () => void
}

export function BargainRequestsTable({ requests, onRefresh }: BargainRequestsTableProps) {
  const { toast } = useToast()
  const [expandedProductDetails, setExpandedProductDetails] = useState<Record<number, any | null | "loading">>({})
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BargainRequest | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [productDetails, setProductDetails] = useState<any>(null)
  const [bargainingStatus, setBargainingStatus] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Function to load product details
  const loadProductDetails = async (request: BargainRequest) => {
    if (expandedProductDetails[request.id] === "loading") return

    setExpandedProductDetails((prev) => ({ ...prev, [request.id]: "loading" }))

    try {
      const details = await getShopifyProductDetails(request.shop_domain, request.product_id, request.variant_id)
      setExpandedProductDetails((prev) => ({ ...prev, [request.id]: details }))
    } catch (error) {
      console.error("Error loading product details:", error)
      setExpandedProductDetails((prev) => ({ ...prev, [request.id]: null }))
    }
  }

  // Function to view details
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

  // Function to update status (reject or approve)
  const handleStatusUpdate = async (requestId: number, status: string, notes?: string) => {
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
  const StatusBadge = ({ status }: { status: string }) => {
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
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No bargain requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">
                        {request.product_title || "Unknown Product"}
                      </span>
                      <span className="text-xs text-muted-foreground">{request.shop_domain}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.product_price
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(request.product_price)
                      : "N/A"}
                  </TableCell>
                  <TableCell>{request.customer_email || "Anonymous"}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    {request.created_at || request.request_date
                      ? formatDistanceToNow(new Date(request.created_at || request.request_date || ""), {
                          addSuffix: true,
                        })
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(request)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(request.id, "approved")}
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
                            onClick={() =>
                              window.open(
                                `https://${request.shop_domain}/admin/products/${request.product_id.split("/").pop()}`,
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in Shopify
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
                  <span className="col-span-3">
                    <StatusBadge status={selectedRequest.status} />
                  </span>
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
                        {productDetails.sku && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">SKU: </span>
                            <span>{productDetails.sku}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `https://${selectedRequest.shop_domain}/admin/products/${selectedRequest.product_id.split("/").pop()}`,
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
                  </div>
                )}

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
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
