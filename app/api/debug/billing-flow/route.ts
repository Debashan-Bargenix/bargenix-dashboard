import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams
    const planId = searchParams.get("planId")

    // Get user's membership
    const membership = await queryDb(
      `
      SELECT 
        um.*, 
        mp.name as plan_name, 
        mp.slug as plan_slug,
        mp.price as plan_price
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1 AND um.status = 'active'
      LIMIT 1
    `,
      [user.id],
    )

    // Get pending memberships
    const pendingMemberships = await queryDb(
      `
      SELECT 
        um.*, 
        mp.name as plan_name, 
        mp.slug as plan_slug,
        mp.price as plan_price
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1 AND um.status = 'pending'
      ORDER BY um.updated_at DESC
    `,
      [user.id],
    )

    // Get all connected stores
    const stores = await queryDb(
      `
      SELECT s.*, t.access_token IS NOT NULL as has_token
      FROM shopify_stores s
      LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.user_id = $1
      ORDER BY s.status = 'active' DESC, s.updated_at DESC
    `,
      [user.id],
    )

    // Get active store
    const activeStore = stores.find((store: any) => store.status === "active" && store.has_token)

    // Get plan details if planId is provided
    let plan = null
    if (planId) {
      const planResult = await queryDb(
        `
        SELECT * FROM membership_plans WHERE id = $1
      `,
        [planId],
      )
      plan = planResult.length > 0 ? planResult[0] : null
    }

    // Construct the correct billing URL
    let billingUrl = null
    if (planId && activeStore) {
      billingUrl = `/api/shopify/start-billing?planId=${planId}&userId=${user.id}&storeId=${activeStore.id}`
    }

    // Get recent billing events
    const billingEvents = await queryDb(
      `
      SELECT * FROM billing_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [user.id],
    )

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        current_plan_id: user.current_plan_id,
      },
      currentMembership: membership.length > 0 ? membership[0] : null,
      pendingMemberships: pendingMemberships,
      stores: stores,
      activeStore: activeStore || null,
      plan: plan,
      billingUrl: billingUrl,
      billingEvents: billingEvents,
      environment: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2023-10",
        NODE_ENV: process.env.NODE_ENV,
      },
    })
  } catch (error: any) {
    console.error("Error in billing-flow debug:", error)
    return NextResponse.json(
      { error: "Failed to get billing flow debug info", message: error.message },
      { status: 500 },
    )
  }
}
