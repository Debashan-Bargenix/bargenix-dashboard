import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"

// This would be integrated into your existing middleware.ts
// Here's the feature control logic that would be added

async function checkFeatureAccess(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  // Get user's plan
  const planSlug = user.plan_slug || "free"

  // Define feature access by plan
  const featureAccess = {
    // Basic features available to all plans
    "/dashboard": ["free", "startup", "business", "enterprise"],
    "/dashboard/inventory": ["free", "startup", "business", "enterprise"],

    // Premium features
    "/dashboard/analytics": ["startup", "business", "enterprise"],
    "/dashboard/advanced-settings": ["business", "enterprise"],
    "/dashboard/white-label": ["enterprise"],
  }

  // Check if the current path requires specific plan access
  for (const [path, allowedPlans] of Object.entries(featureAccess)) {
    if (pathname.startsWith(path) && !allowedPlans.includes(planSlug)) {
      return false
    }
  }

  return true
}

// This would be called in your middleware.ts
export async function checkFeatureMiddleware(request: NextRequest) {
  const hasAccess = await checkFeatureAccess(request)

  if (!hasAccess) {
    const url = new URL("/dashboard/memberships?error=feature_restricted", request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
