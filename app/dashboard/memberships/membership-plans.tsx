"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, ArrowRight, Zap } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { changeMembershipPlan } from "@/app/actions/membership-actions"
import { useToast } from "@/hooks/use-toast"
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

interface MembershipPlansProps {
  plans: any[]
  currentPlanId: number | null
  userId: number
  productUsage: { productsUsed: number }
  shopifyStore: any
}

export default function MembershipPlans({
  plans,
  currentPlanId,
  userId,
  productUsage,
  shopifyStore,
}: MembershipPlansProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Function to safely get features as an array
  const getFeatures = (plan: any): string[] => {
    if (typeof plan.features === "string") {
      return plan.features
        .split(",")
        .map((f: string) => f.trim())
        .filter(Boolean)
    }

    if (Array.isArray(plan.features)) {
      return plan.features.map((f) => String(f))
    }

    // Default features based on plan tier
    const isLowestTier = plan.slug === "free"
    const isHighestTier = plan.slug === "enterprise" || plan.slug === "business"

    return [
      plan.product_limit > 0
        ? `Up to ${plan.product_limit} products with bargaining`
        : "Unlimited products with bargaining",
      isLowestTier
        ? "Basic bargaining features"
        : isHighestTier
          ? "Advanced bargaining with AI"
          : "Enhanced bargaining features",
      isLowestTier ? "Community support" : isHighestTier ? "Priority 24/7 support" : "Email support",
    ]
  }

  const handleUpgrade = async (planId: number, planName: string, planSlug: string) => {
    if (planId === currentPlanId) {
      toast({
        title: "Already Subscribed",
        description: `You are already subscribed to the ${planName} plan.`,
        variant: "default",
      })
      return
    }

    setIsLoading(true)
    setSelectedPlanId(planId)

    try {
      // Check if Shopify store is connected for paid plans
      const isPaidPlan = plans.find((p) => p.id === planId)?.price > 0

      if (isPaidPlan && !shopifyStore) {
        toast({
          title: "Shopify Store Required",
          description: "You need to connect your Shopify store before upgrading to a paid plan.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/dashboard/shopify")
        return
      }

      const formData = new FormData()
      formData.append("userId", userId.toString())
      formData.append("planId", planId.toString())
      formData.append("reason", "User initiated upgrade")

      // For paid plans, use the server action which will handle the redirect
      const result = await changeMembershipPlan(null, formData)

      if (result.success) {
        if (result.redirectToShopify && result.redirectUrl) {
          // Log for debugging
          console.log("Redirecting to Shopify billing:", result.redirectUrl)

          // Redirect to Shopify billing
          window.location.href = result.redirectUrl
          return
        }

        // For free plans or successful non-redirect operations
        toast({
          title: "Plan Updated",
          description: `Your plan has been updated to ${planName}.`,
          variant: "default",
        })
        router.refresh()
      } else {
        throw new Error(result.message || "Failed to upgrade plan")
      }
    } catch (error: any) {
      console.error("Error upgrading plan:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade your plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Group plans by billing frequency
  const monthlyPlans = plans.filter((plan) => plan.billing_frequency === "monthly" || !plan.billing_frequency)
  const yearlyPlans = plans.filter((plan) => plan.billing_frequency === "yearly")

  // If no yearly plans, don't show tabs
  const showTabs = yearlyPlans.length > 0

  // Get the current plan
  const currentPlan = plans.find((plan) => plan.id === currentPlanId)

  return (
    <div className="space-y-6">
      {!shopifyStore && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-medium">Shopify Store Required</h3>
                <p className="text-sm text-muted-foreground">
                  You need to connect your Shopify store before upgrading to a paid plan.{" "}
                  <Button variant="link" className="h-auto p-0" onClick={() => router.push("/dashboard/shopify")}>
                    Connect your store
                  </Button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showTabs ? (
        <Tabs defaultValue="monthly" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly (Save 20%)</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{renderPlans(monthlyPlans)}</div>
          </TabsContent>

          <TabsContent value="yearly" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{renderPlans(yearlyPlans)}</div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{renderPlans(plans)}</div>
      )}
    </div>
  )

  function renderPlans(plansToRender: any[]) {
    return plansToRender.map((plan) => {
      const isCurrentPlan = plan.id === currentPlanId
      const isOverProductLimit = productUsage.productsUsed > plan.product_limit && plan.product_limit > 0
      const isLowestTier = plan.slug === "free"
      const isHighestTier = plan.slug === "enterprise" || plan.slug === "business"
      const isPopular = plan.slug === "startup" || plan.slug === "professional"

      // Get features safely
      const featuresList = getFeatures(plan)

      return (
        <Card
          key={plan.id}
          className={`relative overflow-hidden transition-all ${
            isCurrentPlan ? "border-2 border-primary shadow-md" : "hover:border-primary/50 hover:shadow-md"
          }`}
        >
          {isCurrentPlan && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium">
              Current Plan
            </div>
          )}

          {isPopular && !isCurrentPlan && (
            <div className="absolute top-0 right-0 bg-orange-500 text-white px-3 py-1 text-xs font-medium">Popular</div>
          )}

          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{plan.name}</span>
              <Badge variant={isLowestTier ? "outline" : "default"} className="ml-2">
                {plan.price <= 0 ? "Free" : `$${plan.price}/mo`}
              </Badge>
            </CardTitle>
            <CardDescription>
              {plan.description || `The ${plan.name.toLowerCase()} tier for growing businesses.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Includes:</div>
              <ul className="space-y-2">
                {featuresList.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isOverProductLimit && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-md text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Product limit too low</p>
                  <p className="text-amber-700">
                    You're currently using {productUsage.productsUsed} products, but this plan only supports{" "}
                    {plan.product_limit}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            {isCurrentPlan ? (
              <Button className="w-full" variant="outline" disabled>
                Current Plan
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full"
                    variant={isOverProductLimit ? "outline" : "default"}
                    disabled={isLoading && selectedPlanId === plan.id}
                  >
                    {isLoading && selectedPlanId === plan.id ? (
                      "Processing..."
                    ) : (
                      <>
                        {plan.price <= 0 && currentPlanId !== null
                          ? "Downgrade"
                          : plan.price > 0 &&
                              (currentPlanId === null || plans.find((p) => p.id === currentPlanId)?.price <= 0)
                            ? "Upgrade"
                            : "Switch Plan"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {plan.price <= 0 && currentPlanId !== null
                        ? "Downgrade to Free Plan?"
                        : `Upgrade to ${plan.name}?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {plan.price <= 0 && currentPlanId !== null ? (
                        "Are you sure you want to downgrade to the free plan? You'll lose access to premium features."
                      ) : (
                        <>
                          You're about to upgrade to the {plan.name} plan for ${plan.price}/month.
                          {plan.price > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-sm bg-blue-50 p-3 rounded-md text-blue-800">
                              <Zap className="h-4 w-4 text-blue-500" />
                              <span>Billing will be handled securely through your Shopify account.</span>
                            </div>
                          )}
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleUpgrade(plan.id, plan.name, plan.slug)}
                      className={plan.price <= 0 && currentPlanId !== null ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      {plan.price <= 0 && currentPlanId !== null ? "Confirm Downgrade" : "Confirm Upgrade"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>
      )
    })
  }
}
