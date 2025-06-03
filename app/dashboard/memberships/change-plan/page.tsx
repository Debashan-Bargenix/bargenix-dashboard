import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { changeMembershipPlan } from "@/app/actions/membership-actions"

export default async function ChangePlanPage({
  searchParams,
}: {
  searchParams: { userId?: string; planId?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const userId = searchParams.userId ? Number.parseInt(searchParams.userId) : null
  const planId = searchParams.planId ? Number.parseInt(searchParams.planId) : null

  // Verify the user is authorized
  if (!userId || userId !== user.id || !planId) {
    redirect("/dashboard/memberships?error=invalid_request")
  }

  // Create form data
  const formData = new FormData()
  formData.append("userId", userId.toString())
  formData.append("planId", planId.toString())

  // Change the plan
  const result = await changeMembershipPlan(null, formData)

  if (result.success) {
    redirect(`/dashboard/memberships?success=true&plan=${result.plan.slug}&name=${result.plan.name}`)
  } else {
    redirect(`/dashboard/memberships?error=${encodeURIComponent(result.message)}`)
  }
}
