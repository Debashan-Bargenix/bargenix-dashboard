"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  Crown,
  AlertTriangle,
  Calendar,
  BarChart3,
  Zap,
  ArrowUpRight,
  Clock,
  Shield,
  Sparkles,
  RefreshCw,
  ChevronRight,
  LifeBuoy,
  Rocket,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Gauge,
  Activity,
  BarChart,
  LineChart,
  CreditCard,
  DollarSign,
  CalendarDays,
  Timer,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
} from "lucide-react"
import { cancelShopifyBilling } from "@/app/actions/membership-actions"
import { ensureMembershipTablesExist } from "@/app/actions/db-schema-actions"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"

// Define types for better type safety
interface Membership {
  id: number
  user_id: number
  plan_id: number
  status: string
  shopify_charge_id?: string
  start_date: string
  end_date?: string
  next_billing_date?: string
  trial_end_date?: string
  billing_status?: string
  billing_details?: any
  name: string
  slug: string
  price: number
  product_limit: number
  features: string[]
}

interface ProductUsage {
  productsUsed: number
}

interface User {
  id: number | string
  [key: string]: any
}

interface BillingHistoryItem {
  id: number
  date: string
  type: string
  amount: number
  description: string
  status: string
  chargeId?: string
}

interface BillingInfo {
  currentCycle: number
  daysUntilNextBilling: number | null
  daysUntilTrialEnds: number | null
  totalPaid: number
  daysSinceStart: number
}

interface CurrentPlanProps {
  currentMembership: Membership | null
  productUsage?: ProductUsage
  user: User
}

// Update the component to display next billing date and trial information
export default function CurrentPlan({ currentMembership, productUsage = { productsUsed: 0 }, user }: CurrentPlanProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [downgradeReason, setDowngradeReason] = useState("")
  const [actualProductUsage, setActualProductUsage] = useState(productUsage.productsUsed)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [bargainRequests, setBargainRequests] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([])
  const [dbSchemaChecked, setDbSchemaChecked] = useState(false)
  const { toast } = useToast()

  // Ensure database schema is correct
  useEffect(() => {
    const checkDbSchema = async () => {
      try {
        const result = await ensureMembershipTablesExist()
        if (!result.success) {
          console.error("Error ensuring database schema:", result.error)
          toast({
            title: "Database Schema Warning",
            description: "Some membership features may be limited due to database configuration.",
            variant: "destructive",
          })
        }
        setDbSchemaChecked(true)
      } catch (error) {
        console.error("Error checking database schema:", error)
        setDbSchemaChecked(true) // Continue anyway
      }
    }

    checkDbSchema()
  }, [toast])

  // Fetch actual product usage and billing data
  useEffect(() => {
    const fetchData = async () => {
      console.log("[CurrentPlan useEffect] Fetching data for user:", user)
      if (user && user.id) {
        console.log(`[CurrentPlan useEffect] User ID for API call: ${user.id}`)
      } else {
        console.warn("[CurrentPlan useEffect] User or user.id is undefined. Skipping fetch.")
        setIsLoadingUsage(false)
        return
      }
      if (!dbSchemaChecked || !user?.id) return

      try {
        setIsLoadingUsage(true)

        // Fetch product usage
        try {
          const usageResponse = await fetch(`/api/memberships/usage?userId=${user.id}`)
          if (!usageResponse.ok) throw new Error(`HTTP error! status: ${usageResponse.status}`)

          const usageData = await usageResponse.json()
          console.log("[CurrentPlan useEffect] Received usageData from API:", usageData)

          if (usageData && usageData.data && typeof usageData.data.productsUsed === "number") {
            setActualProductUsage(usageData.data.productsUsed)
            console.log(`[CurrentPlan useEffect] Set actualProductUsage to: ${usageData.data.productsUsed}`)
          } else {
            console.warn("[CurrentPlan useEffect] productsUsed not found or not a number in usageData:", usageData)
          }

          if (usageData && usageData.data) {
            if (typeof usageData.data.requestsUsed === "number") {
              setBargainRequests(usageData.data.requestsUsed)
            }
          }
        } catch (error) {
          console.error("Error fetching usage data:", error)
          // Continue with other data fetching
        }

        // Fetch billing history
        try {
          const billingResponse = await fetch(`/api/memberships/billing-history?userId=${user.id}`)
          if (!billingResponse.ok) throw new Error(`HTTP error! status: ${billingResponse.status}`)

          const billingData = await billingResponse.json()

          if (billingData && Array.isArray(billingData.data)) {
            setBillingHistory(billingData.data)
          }
        } catch (error) {
          console.error("Error fetching billing history:", error)
          // Continue with other data fetching
        }

        // Fetch analytics data for conversion rate
        try {
          const analyticsResponse = await fetch(`/api/analytics/dashboard-data?userId=${user.id}`)
          if (!analyticsResponse.ok) throw new Error(`HTTP error! status: ${analyticsResponse.status}`)

          const analyticsData = await analyticsResponse.json()

          if (analyticsData && typeof analyticsData.conversionRate === "number") {
            setConversionRate(analyticsData.conversionRate)
          }
        } catch (error) {
          console.error("Error fetching analytics data:", error)
          // Continue with default conversion rate
        }
      } catch (error) {
        console.error("Error in fetchData:", error)
        toast({
          title: "Data Fetch Warning",
          description: "Some data couldn't be loaded. Using default values where needed.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingUsage(false)
      }
    }

    fetchData()
  }, [user, toast, dbSchemaChecked])

  if (!currentMembership) {
    return (
      <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">No Active Plan</CardTitle>
          <p className="text-gray-500">You don't have an active membership plan.</p>
        </CardHeader>
        <CardFooter className="flex justify-center pb-8">
          <Button
            onClick={() => (window.location.href = "/dashboard/memberships?tab=plans")}
            className="px-8 py-6 text-lg"
          >
            View Plans <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const {
    name,
    slug,
    price,
    product_limit,
    features,
    start_date,
    shopify_charge_id,
    next_billing_date,
    trial_end_date,
    billing_status,
    billing_details,
  } = currentMembership

  const isFreePlan = slug === "free"
  const productUsagePercentage = product_limit > 0 ? (actualProductUsage / product_limit) * 100 : 0
  const isNearLimit = product_limit > 0 && actualProductUsage >= product_limit * 0.8
  const isOverLimit = product_limit > 0 && actualProductUsage > product_limit

  // Calculate billing cycle information
  const calculateBillingInfo = (): BillingInfo => {
    try {
      const now = new Date()
      const startDate = new Date(start_date)

      // Calculate days since subscription started
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Calculate current billing cycle
      const currentCycle = Math.floor(daysSinceStart / 30) + 1

      // Calculate days until next billing
      const daysUntilNextBilling = next_billing_date
        ? Math.ceil((new Date(next_billing_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Calculate days until trial ends
      const daysUntilTrialEnds = trial_end_date
        ? Math.ceil((new Date(trial_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Calculate total amount paid (for paid plans)
      const totalPaid = isFreePlan ? 0 : (currentCycle - 1) * price

      return {
        currentCycle,
        daysUntilNextBilling,
        daysUntilTrialEnds,
        totalPaid,
        daysSinceStart,
      }
    } catch (error) {
      console.error("Error calculating billing info:", error)
      // Return safe default values
      return {
        currentCycle: 1,
        daysUntilNextBilling: null,
        daysUntilTrialEnds: null,
        totalPaid: 0,
        daysSinceStart: 0,
      }
    }
  }

  const billingInfo = calculateBillingInfo()
  const isInTrial = trial_end_date && billingInfo.daysUntilTrialEnds && billingInfo.daysUntilTrialEnds > 0

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      window.location.href = "/dashboard/memberships?tab=plans"
    } catch (error) {
      console.error("Error navigating to plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManagePlan = async () => {
    setIsLoading(true)
    try {
      toast({
        title: "Manage Billing",
        description: "In a production app, this would redirect to Shopify's billing management page.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error managing plan:", error)
      toast({
        title: "Error",
        description: "Failed to manage billing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelPlan = async () => {
    setIsLoading(true)
    try {
      const result = await cancelShopifyBilling(user.id, downgradeReason)

      if (result.success) {
        toast({
          title: "Plan Cancelled",
          description: "Your subscription has been cancelled successfully.",
          variant: "default",
        })

        setTimeout(() => {
          window.location.href = "/dashboard/memberships?success=true&action=cancelled"
        }, 1500)
      } else {
        throw new Error(result.message || "Failed to cancel plan")
      }
    } catch (error: any) {
      console.error("Error cancelling plan:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel your subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get plan color based on tier
  const getPlanColor = () => {
    switch (slug) {
      case "premium":
      case "professional":
        return "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
      case "business":
      case "enterprise":
        return "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
      case "free":
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-800 dark:text-gray-100"
    }
  }

  // Get usage color based on percentage
  const getUsageColor = () => {
    if (isOverLimit) return "text-red-600"
    if (isNearLimit) return "text-amber-600"
    return "text-green-600"
  }

  // Get plan icon based on tier
  const getPlanIcon = () => {
    switch (slug) {
      case "premium":
      case "professional":
        return <Sparkles className="h-6 w-6 text-yellow-300" />
      case "business":
      case "enterprise":
        return <Rocket className="h-6 w-6 text-blue-300" />
      case "free":
      default:
        return <Shield className="h-6 w-6 text-gray-400" />
    }
  }

  // Get billing status icon and color
  const getBillingStatusInfo = () => {
    if (isFreePlan) {
      return { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600", text: "No billing required" }
    }

    switch (billing_status) {
      case "active":
        return { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600", text: "Active & Current" }
      case "pending":
        return { icon: <Clock className="h-4 w-4" />, color: "text-amber-600", text: "Payment Pending" }
      case "cancelled":
        return { icon: <XCircle className="h-4 w-4" />, color: "text-red-600", text: "Cancelled" }
      case "paused":
        return { icon: <Pause className="h-4 w-4" />, color: "text-gray-600", text: "Paused" }
      default:
        return { icon: <AlertCircle className="h-4 w-4" />, color: "text-gray-600", text: "Unknown" }
    }
  }

  const billingStatusInfo = getBillingStatusInfo()

  return (
    <ErrorBoundary fallback={<div>Something went wrong with the membership display. Please try refreshing.</div>}>
      <div className="space-y-6">
        {/* Plan Header Card */}
        <Card className="overflow-hidden border shadow-md">
          <div className={`${getPlanColor()} px-6 py-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {getPlanIcon()}
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {name}
                    {!isFreePlan && <Crown className="h-5 w-5 text-yellow-300" />}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm opacity-80 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Active since {formatDate(start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Timer className="h-4 w-4" />
                      <span>{billingInfo.daysSinceStart} days active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant={isFreePlan ? "outline" : "secondary"}
                  className={`text-sm px-3 py-1 ${isFreePlan ? "bg-white/90 dark:bg-gray-900/90 dark:text-gray-100 dark:border-gray-600" : "bg-white/20"}`}
                >
                  {isFreePlan ? "Free" : `$${price}/month`}
                </Badge>

                <div className={`flex items-center gap-1.5 text-xs ${billingStatusInfo.color}`}>
                  {billingStatusInfo.icon}
                  <span>{billingStatusInfo.text}</span>
                </div>
              </div>
            </div>

            {/* Billing Information Row */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {/* Next Payment Due */}
              <div className="bg-white/10 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-medium">Next Payment</span>
                </div>
                <p className="text-xs opacity-90">
                  {isFreePlan
                    ? "No payment required"
                    : next_billing_date
                      ? `${formatDate(next_billing_date)} (${billingInfo.daysUntilNextBilling} days)`
                      : "Not scheduled"}
                </p>
              </div>

              {/* Billing Cycle */}
              <div className="bg-white/10 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">Billing Cycle</span>
                </div>
                <p className="text-xs opacity-90">
                  {isFreePlan ? "No billing cycle" : `Cycle ${billingInfo.currentCycle} (Monthly)`}
                </p>
              </div>

              {/* Total Paid */}
              <div className="bg-white/10 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Total Paid</span>
                </div>
                <p className="text-xs opacity-90">{isFreePlan ? "$0.00" : `$${billingInfo.totalPaid.toFixed(2)}`}</p>
              </div>
            </div>

            {/* Trial Information */}
            {isInTrial && (
              <div className="mt-3 flex items-center gap-2 text-sm bg-white/10 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Trial ends on {formatDate(trial_end_date)}
                  {billingInfo.daysUntilTrialEnds !== null && ` (${billingInfo.daysUntilTrialEnds} days remaining)`}
                </span>
              </div>
            )}
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 pt-4 space-y-6">
              {/* Plan Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-50 dark:bg-gray-800 border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                      <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-medium">Products</h3>
                    <p className={`text-xl font-bold ${getUsageColor()}`}>
                      {isLoadingUsage ? "..." : actualProductUsage} / {product_limit > 0 ? product_limit : "∞"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isOverLimit
                        ? "Limit exceeded"
                        : isNearLimit
                          ? "Approaching limit"
                          : "Products with bargaining enabled"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50 dark:bg-gray-800 border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
                      <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium">Bargain Requests</h3>
                    <p className="text-xl font-bold">{bargainRequests}</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50 dark:bg-gray-800 border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-medium">Conversion Rate</h3>
                    <p className="text-xl font-bold">{conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">Bargains to purchases</p>
                  </CardContent>
                </Card>
              </div>

              {/* Plan Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg dark:text-gray-200">
                  <Shield className="h-8 w-8 text-blue-500 mb-2" />
                  <h4 className="font-medium text-center">Secure Billing</h4>
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">Managed through Shopify</p>
                </div>

                <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg dark:text-gray-200">
                  <Zap className="h-8 w-8 text-green-500 mb-2" />
                  <h4 className="font-medium text-center">Instant Access</h4>
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                    Features available immediately
                  </p>
                </div>

                <div className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg dark:text-gray-200">
                  <RefreshCw className="h-8 w-8 text-purple-500 mb-2" />
                  <h4 className="font-medium text-center">Cancel Anytime</h4>
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">No long-term commitment</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {isFreePlan ? (
                  <Button
                    onClick={handleUpgrade}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {isLoading ? "Loading..." : "Upgrade Plan"} <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleManagePlan} disabled={isLoading} variant="outline">
                      {isLoading ? "Loading..." : "Manage Billing"}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={isLoading}
                        >
                          {isLoading ? "Processing..." : "Cancel Plan"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">Are you sure you want to cancel?</AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Cancelling your plan will downgrade you to the free plan and limit your access to premium
                            features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md my-4">
                          <h4 className="font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" /> What you'll lose
                          </h4>
                          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                            <li>• Advanced bargaining features</li>
                            <li>• Higher product limits</li>
                            <li>• Premium support</li>
                          </ul>
                        </div>
                        <Textarea
                          placeholder="Tell us why you're cancelling (optional)"
                          value={downgradeReason}
                          onChange={(e) => setDowngradeReason(e.target.value)}
                          className="my-4"
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-medium">Keep My Plan</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelPlan}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Cancel Plan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="p-6 pt-4 space-y-6">
              {/* Billing Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{name}</p>
                    <p className="text-sm text-gray-500">{isFreePlan ? "Free" : `$${price}/month`}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-green-500" />
                      Next Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {isFreePlan
                        ? "N/A"
                        : billingInfo.daysUntilNextBilling !== null
                          ? `${billingInfo.daysUntilNextBilling}d`
                          : "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isFreePlan
                        ? "No payment required"
                        : next_billing_date
                          ? formatDate(next_billing_date)
                          : "Not scheduled"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${billingInfo.totalPaid.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Since {formatDate(start_date)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                      Billing Cycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{isFreePlan ? "N/A" : billingInfo.currentCycle}</p>
                    <p className="text-sm text-gray-500">{isFreePlan ? "No billing" : "Monthly cycles"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Billing Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Billing Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`${billingStatusInfo.color}`}>{billingStatusInfo.icon}</div>
                      <div>
                        <h4 className="font-medium">Subscription Status</h4>
                        <p className="text-sm text-gray-500">{billingStatusInfo.text}</p>
                      </div>
                    </div>
                    <Badge variant={billing_status === "active" ? "default" : "outline"}>
                      {billing_status || "Free"}
                    </Badge>
                  </div>

                  {shopify_charge_id && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Shopify Charge ID</h4>
                        <p className="text-sm text-gray-500 font-mono">{shopify_charge_id}</p>
                      </div>
                    </div>
                  )}

                  {billing_details && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium mb-2">Billing Details</h4>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                        {JSON.stringify(billing_details, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{isFreePlan ? "No payment method required" : "Shopify Billing"}</h4>
                        <p className="text-sm text-gray-500">
                          {isFreePlan
                            ? "Free plan doesn't require payment"
                            : "Payments are processed securely through Shopify"}
                        </p>
                      </div>
                    </div>
                    {!isFreePlan && (
                      <Button variant="outline" size="sm" onClick={handleManagePlan}>
                        Manage
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Billing History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Recent Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {billingHistory.length > 0 ? (
                    <div className="space-y-2">
                      {billingHistory.slice(0, 5).map((item: BillingHistoryItem, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{formatDate(item.date)}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${item.amount.toFixed(2)}</p>
                            <Badge variant={item.status === "paid" ? "default" : "outline"} className="text-xs">
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {isFreePlan ? "No billing history for free plan" : "No billing history available"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="p-6 pt-4 space-y-6">
              {/* Product Usage with Visual Indicator */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    <h3 className="font-medium">Product Usage</h3>
                  </div>
                  <span className={`font-semibold ${getUsageColor()}`}>
                    {isLoadingUsage ? "Loading..." : actualProductUsage} /{" "}
                    {product_limit > 0 ? product_limit : "Unlimited"}
                  </span>
                </div>

                {product_limit > 0 && (
                  <>
                    <Progress
                      value={productUsagePercentage}
                      className="h-2.5 rounded-full"
                      indicatorClassName={`${isOverLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-green-500"}`}
                    />

                    {!isLoadingUsage && isOverLimit && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-medium">You've exceeded your product limit</p>
                          <p className="text-xs mt-0.5">
                            Upgrade your plan to add more products with bargaining enabled.
                          </p>
                        </div>
                      </div>
                    )}

                    {!isLoadingUsage && isNearLimit && !isOverLimit && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-medium">You're approaching your product limit</p>
                          <p className="text-xs mt-0.5">Consider upgrading your plan soon to avoid disruptions.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Usage Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Bargain Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{bargainRequests}</p>
                        <p className="text-xs text-gray-500">This month</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Limit</p>
                        <p className="text-lg font-semibold">{isFreePlan ? "100" : "1,000"}</p>
                      </div>
                    </div>
                    <Progress value={(bargainRequests / (isFreePlan ? 100 : 1000)) * 100} className="h-2 mt-3" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-green-500" />
                      API Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">1,245</p>
                        <p className="text-xs text-gray-500">API calls this month</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Limit</p>
                        <p className="text-lg font-semibold">{isFreePlan ? "1,000" : "10,000"}</p>
                      </div>
                    </div>
                    <Progress value={(1245 / (isFreePlan ? 1000 : 10000)) * 100} className="h-2 mt-3" />
                  </CardContent>
                </Card>
              </div>

              {/* Usage Charts */}
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-purple-500" />
                      Usage Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <BarChart className="h-8 w-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Usage trends will appear here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="p-6 pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(features) &&
                  features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{feature}</span>
                        <p className="text-xs text-gray-500 mt-1">{getFeatureDescription(feature)}</p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Compare Plans */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Compare with other plans</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Feature
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Free
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Startup
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className="px-4 py-3 text-sm">Products with bargaining</td>
                        <td className="px-4 py-3 text-sm">10</td>
                        <td className="px-4 py-3 text-sm">50</td>
                        <td className="px-4 py-3 text-sm">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm">Monthly bargain requests</td>
                        <td className="px-4 py-3 text-sm">100</td>
                        <td className="px-4 py-3 text-sm">1,000</td>
                        <td className="px-4 py-3 text-sm">10,000</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm">Analytics</td>
                        <td className="px-4 py-3 text-sm">Basic</td>
                        <td className="px-4 py-3 text-sm">Advanced</td>
                        <td className="px-4 py-3 text-sm">Premium</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm">Support</td>
                        <td className="px-4 py-3 text-sm">Email</td>
                        <td className="px-4 py-3 text-sm">Priority Email</td>
                        <td className="px-4 py-3 text-sm">24/7 Support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upgrade CTA */}
              {isFreePlan && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg mt-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">Ready to unlock more features?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Upgrade to a premium plan to access advanced bargaining features, higher limits, and priority
                        support.
                      </p>
                    </div>
                    <Button
                      onClick={handleUpgrade}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      Upgrade Now <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Help & Support Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-blue-500" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium">Documentation</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Check our comprehensive guides and documentation for detailed information about your plan.
                  </p>
                  <Button variant="link" className="px-0 h-auto text-blue-600 dark:text-blue-400">
                    View Documentation
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Contact Support</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Have questions about your plan or need assistance? Our support team is here to help.
                  </p>
                  <Button variant="link" className="px-0 h-auto text-green-600 dark:text-green-400">
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}

// Helper function to get feature descriptions
function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    "View all Shopify inventory": "Access and manage all products from your Shopify store.",
    "Add up to 10 products for bargaining": "Enable bargaining functionality on up to 10 products in your store.",
    "Free installation guide": "Step-by-step instructions to set up Bargenix on your Shopify store.",
    "Chat support": "Get help via our chat support during business hours.",
    "Basic analytics": "View essential metrics about your bargaining performance.",
    "Advanced analytics": "Detailed insights and reports on customer bargaining behavior.",
    "Premium support": "Priority support with faster response times.",
    "Unlimited products": "No limit on the number of products with bargaining enabled.",
    "Custom bargaining rules": "Create tailored bargaining experiences for different products.",
    "API access": "Integrate Bargenix with your custom solutions via our API.",
    "White-label option": "Remove Bargenix branding for a seamless customer experience.",
    "Multiple store support": "Connect and manage multiple Shopify stores from one account.",
  }

  return descriptions[feature] || "Additional feature included in your plan."
}
