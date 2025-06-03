"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, Clock, DollarSign, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BillingEvent {
  id: number
  user_id: number
  event_type: string
  charge_id?: string
  plan_id?: number
  plan_name?: string
  amount?: number
  status?: string
  created_at: string
  details?: any
}

export function BillingHistoryTab({ userId }: { userId: number }) {
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBillingEvents() {
      try {
        setLoading(true)
        const response = await fetch(`/api/memberships/billing-history?userId=${userId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch billing history")
        }

        const data = await response.json()
        setBillingEvents(data.events || [])
      } catch (error) {
        console.error("Error fetching billing history:", error)
        setError("Failed to load billing history. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchBillingEvents()
  }, [userId])

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Error
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>
    }
  }

  // Helper function to get event type display
  const getEventTypeDisplay = (eventType: string) => {
    switch (eventType) {
      case "membership_change_initiated":
        return "Plan Change Initiated"
      case "membership_changed":
        return "Plan Changed"
      case "membership_pending_created":
        return "Pending Membership Created"
      case "membership_billing_confirmed":
        return "Billing Confirmed"
      case "membership_cancelled":
        return "Membership Cancelled"
      case "shopify_billing_initiated":
        return "Shopify Billing Initiated"
      case "shopify_charge_created":
        return "Shopify Charge Created"
      case "shopify_charge_activated":
        return "Shopify Charge Activated"
      default:
        return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing activities and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing activities and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-red-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (billingEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing activities and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No billing history yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your billing activities and transactions will appear here once you upgrade to a paid plan.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>Your recent billing activities and transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{formatDate(event.created_at)}</TableCell>
                <TableCell>
                  {event.event_type === "shopify_charge_activated" ? (
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-green-500" />
                      <span>Subscription Activated</span>
                    </div>
                  ) : (
                    getEventTypeDisplay(event.event_type)
                  )}
                </TableCell>
                <TableCell>{event.plan_name || "N/A"}</TableCell>
                <TableCell>{event.status ? getStatusBadge(event.status) : "N/A"}</TableCell>
                <TableCell>
                  {event.amount ? `$${Number.parseFloat(event.amount.toString()).toFixed(2)}` : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
