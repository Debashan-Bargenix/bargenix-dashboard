"use client"

import { useState, useEffect } from "react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { CreditCard, Crown, Star, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export function MembershipStatusWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchMembershipData()
  }, [])

  const fetchMembershipData = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 700))
      setData({
        currentPlan: "Business",
        nextBilling: "Dec 25, 2024",
        usage: {
          products: { current: 156, limit: 500 },
          requests: { current: 89, limit: 1000 },
        },
        features: ["Advanced Analytics", "Priority Support", "Custom Branding"],
      })
    } catch (error) {
      console.error("Error fetching membership data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardCard title="Membership" icon={<CreditCard className="h-5 w-5" />}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </DashboardCard>
    )
  }

  const getPlanIcon = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "enterprise":
        return <Crown className="h-4 w-4 text-purple-600" />
      case "business":
        return <Star className="h-4 w-4 text-blue-600" />
      case "startup":
        return <Zap className="h-4 w-4 text-green-600" />
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "enterprise":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
      case "business":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
      case "startup":
        return "text-green-600 bg-green-100 dark:bg-green-900/30"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30"
    }
  }

  return (
    <DashboardCard title="Membership Status" icon={<CreditCard className="h-5 w-5 text-blue-600" />} gradient="blue">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center px-2 py-1 rounded-md ${getPlanColor(data?.currentPlan)}`}>
            {getPlanIcon(data?.currentPlan)}
            <span className="ml-1 text-sm font-medium">{data?.currentPlan}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Products Used</span>
              <span>
                {data?.usage?.products?.current}/{data?.usage?.products?.limit}
              </span>
            </div>
            <Progress value={data?.usage?.products?.current} max={data?.usage?.products?.limit} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Monthly Requests</span>
              <span>
                {data?.usage?.requests?.current}/{data?.usage?.requests?.limit}
              </span>
            </div>
            <Progress value={data?.usage?.requests?.current} max={data?.usage?.requests?.limit} className="h-2" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Next billing: {data?.nextBilling}</div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/dashboard/memberships">Manage Plan</Link>
        </Button>
      </div>
    </DashboardCard>
  )
}
