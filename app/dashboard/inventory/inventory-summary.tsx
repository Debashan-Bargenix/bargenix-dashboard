import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, BarChart, Award, DollarSign } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface InventorySummaryProps {
  totalProducts: number
  totalVariants: number
  totalInventory: number
  totalValue: number
  bargainingEnabled: number
  membership: {
    name: string
    productsAllowed: number
    productsUsed: number
  }
  currency?: string
  isLoading?: boolean
}

export function InventorySummary({
  totalProducts,
  totalVariants,
  totalInventory,
  totalValue,
  bargainingEnabled,
  membership,
  currency = "USD",
  isLoading = false,
}: InventorySummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="h-[120px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Format currency based on the provided currency code
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate percentage for bargaining enabled
  const bargainingPercentage = totalProducts > 0 ? Math.round((bargainingEnabled / totalProducts) * 100) : 0

  // Calculate percentage for membership usage
  const membershipUsagePercentage =
    membership.productsAllowed > 0
      ? Math.min(100, Math.round((membership.productsUsed / membership.productsAllowed) * 100))
      : 0

  // Determine color for membership usage
  const getMembershipUsageColor = () => {
    if (membershipUsagePercentage >= 90) return "text-red-500 dark:text-red-400"
    if (membershipUsagePercentage >= 75) return "text-amber-500 dark:text-amber-400"
    return "text-green-500 dark:text-green-400"
  }

  // Get the appropriate currency icon
  const getCurrencySymbol = () => {
    switch (currency) {
      case "EUR":
        return "€"
      case "GBP":
        return "£"
      case "JPY":
        return "¥"
      case "INR":
        return "₹"
      case "CAD":
      case "AUD":
      case "USD":
      default:
        return "$"
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-800 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Products</h3>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold dark:text-white">{totalProducts}</div>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              {totalVariants} variants across all products
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-800 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Inventory Value</h3>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground dark:text-slate-400">Based on current inventory levels</p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-800 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Bargaining Enabled</h3>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <BarChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold dark:text-white">
              {bargainingEnabled}{" "}
              <span className="text-sm font-normal text-muted-foreground dark:text-slate-400">of {totalProducts}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground dark:text-slate-400">Enabled</p>
                <p className="text-xs font-medium dark:text-slate-300">{bargainingPercentage}%</p>
              </div>
              <Progress
                value={bargainingPercentage}
                className="h-1 bg-purple-100 dark:bg-purple-900/30"
                indicatorClassName="bg-purple-500 dark:bg-purple-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-800 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Membership</h3>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold dark:text-white">{membership.name}</div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground dark:text-slate-400">Products used</p>
                <p className={`text-xs font-medium ${getMembershipUsageColor()}`}>
                  {membership.productsUsed} / {membership.productsAllowed}
                </p>
              </div>
              <Progress
                value={membershipUsagePercentage}
                className={`h-1 ${
                  membershipUsagePercentage >= 90
                    ? "bg-red-100 dark:bg-red-900/30"
                    : membershipUsagePercentage >= 75
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                }`}
                indicatorClassName={`${
                  membershipUsagePercentage >= 90
                    ? "bg-red-500 dark:bg-red-400"
                    : membershipUsagePercentage >= 75
                      ? "bg-amber-500 dark:bg-amber-400"
                      : "bg-green-500 dark:bg-green-400"
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
