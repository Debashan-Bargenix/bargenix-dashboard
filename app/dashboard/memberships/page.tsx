import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getMembershipPlans,
  getUserMembership,
  getUserProductUsage,
  getMembershipHistory,
} from "@/app/actions/membership-actions"
import { getConnectedShopifyStore } from "@/app/actions/shopify-actions"
import { MembershipsClient } from "./memberships-client"

export const dynamic = "force-dynamic"

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: {
    success?: string
    error?: string
    plan?: string
    name?: string
    tab?: string
    message?: string
    action?: string
  }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch data with error handling
  let plans = []
  let currentMembership = null
  let productUsage = { productsUsed: 0 }
  let membershipHistory = []
  let shopifyStore = null

  try {
    plans = await getMembershipPlans()
  } catch (error) {
    console.error("Error fetching plans:", error)
  }

  try {
    currentMembership = await getUserMembership(user.id)
  } catch (error) {
    console.error("Error fetching current membership:", error)
  }

  try {
    productUsage = await getUserProductUsage(user.id)
  } catch (error) {
    console.error("Error fetching product usage:", error)
  }

  try {
    membershipHistory = await getMembershipHistory(user.id)
  } catch (error) {
    console.error("Error fetching membership history:", error)
  }

  // Get the connected Shopify store directly
  try {
    shopifyStore = await getConnectedShopifyStore(user.id)
  } catch (error) {
    console.error("Error fetching connected Shopify store:", error)
  }

  // Get the active tab from search params
  const activeTab = searchParams.tab || "current"

  return (
    <MembershipsClient
      user={user}
      plans={plans}
      currentMembership={currentMembership}
      productUsage={productUsage}
      membershipHistory={membershipHistory}
      shopifyStore={shopifyStore}
      activeTab={activeTab}
      searchParams={searchParams}
    />
  )
}
