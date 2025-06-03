"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical, Clock, CheckCircle, XCircle, ShoppingCart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import type { BargainRequest } from "@/app/actions/bargain-request-actions"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"

interface RecentRequestCardsProps {
  requests: BargainRequest[]
  onViewDetails: (request: BargainRequest) => void
  onApprove: (request: BargainRequest) => void
  onReject: (request: BargainRequest) => void
  onComplete: (request: BargainRequest) => void
}

export function RecentRequestCards({
  requests,
  onViewDetails,
  onApprove,
  onReject,
  onComplete,
}: RecentRequestCardsProps) {
  // Get only the 3 most recent requests
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

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

  // Generate a color based on email
  const getAvatarColor = (email: string) => {
    if (!email) return "bg-gray-400"
    const colors = [
      "bg-red-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ]
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  if (recentRequests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No recent bargain requests</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {recentRequests.map((request) => (
        <Card key={request.id} className="overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium truncate max-w-[150px]">{request.product_title || "Product Request"}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(request)}>View details</DropdownMenuItem>
                {request.status === "pending" && (
                  <>
                    <DropdownMenuItem onClick={() => onApprove(request)}>Approve</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject(request)}>Reject</DropdownMenuItem>
                  </>
                )}
                {request.status === "approved" && (
                  <DropdownMenuItem onClick={() => onComplete(request)}>Mark as completed</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent className="pb-0">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {request.notes || `Bargain request for ${request.product_title || "product"} from ${request.shop_domain}`}
            </p>
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-4 pb-4">
            <div className="flex -space-x-2">
              <Avatar className="border-2 border-background">
                <AvatarImage src={`/placeholder.svg?height=32&width=32&query=avatar`} />
                <AvatarFallback className={getAvatarColor(request.customer_email || "")}>
                  {getInitials(request.customer_email || "")}
                </AvatarFallback>
              </Avatar>
              {request.product_price && (
                <div className="flex items-center ml-2">
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(request.product_price)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={request.status} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
