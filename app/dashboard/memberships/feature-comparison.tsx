"use client"

import { CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FeatureComparisonProps {
  plans: any[]
  currentPlanId: number | null
}

// Define all possible features
const allFeatures = [
  {
    name: "Products",
    key: "products",
    tooltip: "Number of products you can add for bargaining",
  },
  {
    name: "Custom Widget Colors",
    key: "custom_colors",
    tooltip: "Customize the colors of your bargaining widget",
  },
  {
    name: "Remove Branding",
    key: "remove_branding",
    tooltip: "Remove Bargenix branding from the widget",
  },
  {
    name: "Advanced Bargaining Rules",
    key: "advanced_rules",
    tooltip: "Set complex bargaining rules based on product categories, inventory, etc.",
  },
  {
    name: "Analytics Dashboard",
    key: "analytics",
    tooltip: "Access detailed analytics about bargaining performance",
  },
  {
    name: "API Access",
    key: "api_access",
    tooltip: "Access to our API for custom integrations",
  },
  {
    name: "Priority Support",
    key: "priority_support",
    tooltip: "Get faster responses from our support team",
  },
  {
    name: "Custom Integrations",
    key: "custom_integrations",
    tooltip: "Custom integrations with other platforms",
  },
  {
    name: "Coupon Customization",
    key: "coupon_customization",
    tooltip: "Create custom coupons for bargaining",
  },
]

// Map features to plans
const featureMap: Record<string, Record<string, boolean | string>> = {
  free: {
    products: "10",
    custom_colors: false,
    remove_branding: false,
    advanced_rules: false,
    analytics: "Basic",
    api_access: false,
    priority_support: false,
    custom_integrations: false,
    coupon_customization: false,
  },
  startup: {
    products: "100",
    custom_colors: true,
    remove_branding: true,
    advanced_rules: false,
    analytics: "Standard",
    api_access: false,
    priority_support: "Email",
    custom_integrations: false,
    coupon_customization: false,
  },
  business: {
    products: "500",
    custom_colors: true,
    remove_branding: true,
    advanced_rules: true,
    analytics: "Advanced",
    api_access: true,
    priority_support: "Priority",
    custom_integrations: false,
    coupon_customization: false,
  },
  enterprise: {
    products: "Unlimited",
    custom_colors: true,
    remove_branding: true,
    advanced_rules: true,
    analytics: "Enterprise",
    api_access: true,
    priority_support: "Dedicated",
    custom_integrations: true,
    coupon_customization: true,
  },
}

export default function FeatureComparison({ plans, currentPlanId }: FeatureComparisonProps) {
  // Sort plans by price
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price)

  // Get current plan
  const currentPlan = plans.find((plan) => plan.id === currentPlanId)
  const currentPlanSlug = currentPlan?.slug || "free"

  return (
    <div className="overflow-x-auto">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Feature</TableHead>
              {sortedPlans.map((plan) => (
                <TableHead key={plan.id} className="text-center">
                  {plan.name}
                  {plan.id === currentPlanId && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allFeatures.map((feature) => (
              <TableRow key={feature.key}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1">
                    {feature.name}
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{feature.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                {sortedPlans.map((plan) => {
                  const planFeatures = featureMap[plan.slug] || {}
                  const featureValue = planFeatures[feature.key]

                  return (
                    <TableCell key={`${plan.id}-${feature.key}`} className="text-center">
                      {typeof featureValue === "boolean" ? (
                        featureValue ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className={plan.id === currentPlanId ? "font-semibold" : ""}>{featureValue}</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
}
