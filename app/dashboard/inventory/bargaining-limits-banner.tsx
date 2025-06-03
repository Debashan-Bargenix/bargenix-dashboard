"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { InfoIcon, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getUserBargainingLimits } from "@/app/actions/bargaining-actions"

interface BargainingLimitsProps {
  initialLimits?: {
    maxProducts: number
    currentlyEnabled: number
    membershipLevel: string
    planName?: string
  }
}

export function BargainingLimitsBanner({ initialLimits }: BargainingLimitsProps) {
  const [limits, setLimits] = useState(
    initialLimits || {
      maxProducts: 0,
      currentlyEnabled: 0,
      membershipLevel: "free",
      planName: "Free",
    },
  )
  const [isLoading, setIsLoading] = useState(!initialLimits)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setIsLoading(true)
        const data = await getUserBargainingLimits()
        setLimits(data)
        setLastUpdated(new Date())
      } catch (error) {
        console.error("Error fetching bargaining limits:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // If no initial limits or it's been more than 30 seconds since last update
    if (!initialLimits || Date.now() - lastUpdated.getTime() > 30000) {
      fetchLimits()
    }
  }, [initialLimits, lastUpdated])

  // Calculate percentage used
  const percentageUsed =
    limits.maxProducts > 0 ? Math.min(Math.round((limits.currentlyEnabled / limits.maxProducts) * 100), 100) : 0

  // Determine if unlimited
  const isUnlimited = limits.maxProducts === 0 || limits.membershipLevel === "enterprise"

  // Determine remaining products
  const remainingProducts = isUnlimited ? "∞" : Math.max(0, limits.maxProducts - limits.currentlyEnabled)

  // Determine status and styling
  let status = "normal"
  let icon = <InfoIcon className="h-5 w-5" />
  let title = "Bargaining Products"
  let variant = "default"

  if (isUnlimited) {
    status = "unlimited"
    icon = <CheckCircle className="h-5 w-5 text-green-500" />
    title = "Unlimited Bargaining Products"
  } else if (percentageUsed >= 90) {
    status = "critical"
    icon = <AlertTriangle className="h-5 w-5 text-amber-500" />
    title = "Bargaining Limit Almost Reached"
    variant = "warning"
  } else if (percentageUsed >= 75) {
    status = "warning"
    icon = <AlertTriangle className="h-5 w-5 text-amber-400" />
    title = "Bargaining Limit Approaching"
    variant = "warning"
  }

  // Get membership display name
  const getMembershipName = () => {
    return limits.planName || limits.membershipLevel.charAt(0).toUpperCase() + limits.membershipLevel.slice(1)
  }

  if (isLoading) {
    return (
      <Alert className="mb-6 animate-pulse bg-muted">
        <AlertTitle className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted-foreground/30"></div>
          <div className="h-4 w-40 rounded bg-muted-foreground/30"></div>
        </AlertTitle>
        <AlertDescription className="mt-2">
          <div className="h-4 w-full rounded bg-muted-foreground/30"></div>
          <div className="mt-2 h-2 w-full rounded bg-muted-foreground/30"></div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant={variant} className="mb-6">
      <AlertTitle className="flex items-center gap-2">
        {icon}
        {title}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 text-sm">
          {isUnlimited ? (
            <p>
              Your <span className="font-medium">{getMembershipName()}</span> membership allows you to enable bargaining
              for unlimited products. Currently, you have enabled bargaining for{" "}
              <span className="font-medium">{limits.currentlyEnabled}</span> products.
            </p>
          ) : (
            <p>
              Your <span className="font-medium">{getMembershipName()}</span> membership allows you to enable bargaining
              for up to <span className="font-medium">{limits.maxProducts}</span> products. Currently, you have enabled
              bargaining for <span className="font-medium">{limits.currentlyEnabled}</span> products (
              <span className="font-medium">{remainingProducts}</span> remaining).
            </p>
          )}
        </div>

        {!isUnlimited && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{limits.currentlyEnabled} used</span>
              <span>{limits.maxProducts} total</span>
            </div>
            <Progress
              value={percentageUsed}
              className="h-2"
              indicatorClassName={
                percentageUsed >= 90 ? "bg-red-500" : percentageUsed >= 75 ? "bg-amber-500" : "bg-green-500"
              }
            />
          </div>
        )}

        {percentageUsed >= 75 && !isUnlimited && (
          <div className="mt-3">
            <Link href="/dashboard/memberships">
              <Button variant="outline" size="sm" className="gap-1">
                Upgrade your plan <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
