import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { confirmShopifyBilling } from "@/app/actions/membership-actions"

export default async function ConfirmBillingPage({
  searchParams,
}: {
  searchParams: {
    plan?: string
    userId?: string
    planId?: string
    charge_id?: string
    sessionId?: string
  }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login?redirect=/dashboard/memberships")
  }

  const { plan, userId, planId, charge_id, sessionId } = searchParams

  if (!planId) {
    redirect("/dashboard/memberships?error=invalid_params&message=Missing plan ID")
  }

  if (!charge_id) {
    redirect("/dashboard/memberships?error=invalid_params&message=Missing charge ID")
  }

  // Use the user ID from the session if not provided in the URL
  const userIdToUse = userId ? Number.parseInt(userId as string, 10) : user.id

  // Confirm the billing
  const result = await confirmShopifyBilling(userIdToUse, Number.parseInt(planId as string, 10), charge_id, sessionId)

  if (!result.success) {
    redirect(
      `/dashboard/memberships?error=billing_failed&message=${encodeURIComponent(result.message || "Failed to confirm billing")}`,
    )
  }

  // Redirect to success page
  redirect(`/dashboard/memberships?success=true&plan=${plan || planId}`)
}
