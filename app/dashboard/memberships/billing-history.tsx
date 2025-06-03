"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BillingEvent {
  id: number
  event_type: string
  charge_id: string
  plan_id: number
  plan_slug: string
  amount: string
  status: string
  created_at: string
  details: any
}

export function BillingHistory() {
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        const response = await fetch("/api/memberships/billing-history")

        if (!response.ok) {
          throw new Error("Failed to fetch billing history")
        }

        const data = await response.json()
        setBillingEvents(data.events || [])
      } catch (err) {
        console.error("Error fetching billing history:", err)
        setError("Failed to load billing history")
      } finally {
        setLoading(false)
      }
    }

    fetchBillingHistory()
  }, [])

  const formatAmount = (amount: string) => {
    if (!amount) return "-"
    const numAmount = Number.parseFloat(amount)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount)
  }

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "membership_activated":
        return "Plan Activated"
      case "membership_cancelled":
        return "Plan Cancelled"
      case "membership_pending":
        return "Payment Pending"
      case "membership_status_change":
        return "Status Changed"
      default:
        return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Pending
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            Cancelled
          </Badge>
        )
      case "frozen":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Frozen
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "membership_activated":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "membership_cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "membership_pending":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  const getPlanName = (planSlug: string) => {
    switch (planSlug) {
      case "free":
        return "Free"
      case "startup":
        return "Startup"
      case "business":
        return "Business"
      case "enterprise":
        return "Enterprise"
      default:
        return planSlug
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
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
          <CardDescription>Your recent billing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium">Error Loading Billing History</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>Your recent billing activity</CardDescription>
      </CardHeader>
      <CardContent>
        {billingEvents.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-muted-foreground">No billing history available</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {formatDate(event.created_at, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: undefined,
                      minute: undefined,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.event_type)}
                      {getEventTypeLabel(event.event_type)}
                    </div>
                  </TableCell>
                  <TableCell>{getPlanName(event.plan_slug)}</TableCell>
                  <TableCell>{formatAmount(event.amount)}</TableCell>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
