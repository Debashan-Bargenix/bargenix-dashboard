"use client"

import MembershipPlans from "./membership-plans"
import CurrentPlan from "./current-plan"
import MembershipHistory from "./membership-history"
import { BillingHistoryTab } from "./billing-history-tab"
import FeatureComparison from "./feature-comparison"
import MembershipFAQ from "./membership-faq"
import MembershipSuccess from "./membership-success"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"

interface MembershipsClientProps {
  user: any
  plans: any[]
  currentMembership: any
  productUsage: { productsUsed: number }
  membershipHistory: any[]
  shopifyStore: any
  activeTab: string
  searchParams: {
    success?: string
    error?: string
    plan?: string
    name?: string
    tab?: string
    message?: string
    action?: string
  }
}

export function MembershipsClient({
  user,
  plans,
  currentMembership,
  productUsage,
  membershipHistory,
  shopifyStore,
  activeTab,
  searchParams,
}: MembershipsClientProps) {
  return (
    <div className="space-y-6">
      {/* Success/Error Messages Handler Component */}
      <MembershipSuccess />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Memberships</h1>
        <p className="text-muted-foreground">Manage your membership plan and subscription details.</p>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={activeTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="current">Current Plan</TabsTrigger>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
        </TabsList>

        {/* Current Plan Tab */}
        <TabsContent value="current" className="space-y-6">
          {currentMembership ? (
            <CurrentPlan currentMembership={currentMembership} user={user} productUsage={productUsage} />
          ) : (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">No Active Plan</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                  You don't have an active membership plan. Choose a plan to unlock premium features and grow your
                  business.
                </CardDescription>
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
          )}

          {/* Feature Comparison */}
          <FeatureComparison plans={plans} />
        </TabsContent>

        {/* Available Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <MembershipPlans
            plans={plans}
            currentPlanId={currentMembership?.plan_id || null}
            userId={user.id}
            productUsage={productUsage}
            shopifyStore={shopifyStore}
          />
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="history" className="space-y-6">
          <BillingHistoryTab userId={user.id} />

          {membershipHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Membership Changes</h3>
              <MembershipHistory history={membershipHistory} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* FAQ Section */}
      <MembershipFAQ />
    </div>
  )
}
