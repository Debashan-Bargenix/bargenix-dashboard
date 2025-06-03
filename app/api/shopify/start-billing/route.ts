import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { logBillingEvent } from "@/lib/billing-logger"

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams
    const planId = searchParams.get("planId")
    const userId = searchParams.get("userId")
    const storeId = searchParams.get("storeId")
    const sessionId = searchParams.get("sessionId")

    console.log("Start billing params:", { planId, userId, storeId, sessionId })

    // Validate required parameters
    if (!planId || !userId) {
      console.error("Missing required parameters:", { planId, userId })
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: {
            planId: planId ? "✓" : "✗",
            userId: userId ? "✓" : "✗",
          },
        },
        { status: 400 },
      )
    }

    // Get current user for authorization
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.id !== Number.parseInt(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get plan details
    const planResult = await queryDb(
      `
      SELECT * FROM membership_plans WHERE id = $1
    `,
      [planId],
    )

    if (planResult.length === 0) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    const plan = planResult[0]

    // Get store details - if storeId is provided, use it, otherwise get the active store for the user
    let store
    if (storeId) {
      const storeResult = await queryDb(
        `
        SELECT s.*, t.access_token
        FROM shopify_stores s
        LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
        WHERE s.id = $1 AND s.user_id = $2
      `,
        [storeId, userId],
      )

      if (storeResult.length === 0) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 })
      }

      store = storeResult[0]
    } else {
      // Get the active store for the user
      const storeResult = await queryDb(
        `
        SELECT s.*, t.access_token
        FROM shopify_stores s
        LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.updated_at DESC
        LIMIT 1
      `,
        [userId],
      )

      if (storeResult.length === 0) {
        return NextResponse.json({ error: "No active store found for user" }, { status: 404 })
      }

      store = storeResult[0]
    }

    // Ensure we have an access token
    if (!store.access_token) {
      return NextResponse.json({ error: "Shopify access token not found" }, { status: 404 })
    }

    // Create a pending membership record if one doesn't exist
    const existingPending = await queryDb(
      `
      SELECT id FROM user_memberships 
      WHERE user_id = $1 AND plan_id = $2 AND status = 'pending'
    `,
      [userId, planId],
    )

    let pendingMembershipId: number

    if (existingPending.length === 0) {
      // Create new pending membership
      const result = await queryDb(
        `
        INSERT INTO user_memberships (user_id, plan_id, status, start_date, session_id)
        VALUES ($1, $2, 'pending', NOW(), $3)
        RETURNING id
      `,
        [userId, planId, sessionId || null],
      )
      pendingMembershipId = result[0].id
    } else {
      pendingMembershipId = existingPending[0].id
      // Update session ID if provided
      if (sessionId) {
        await queryDb(
          `
          UPDATE user_memberships
          SET updated_at = NOW(), session_id = $1
          WHERE id = $2
        `,
          [sessionId, pendingMembershipId],
        )
      }
    }

    // Log the billing initiation
    await logBillingEvent({
      userId: Number.parseInt(userId),
      eventType: "shopify_billing_initiated",
      planId: Number.parseInt(planId),
      status: "initiated",
      sessionId: sessionId || null,
      details: {
        store_id: store.id,
        shop_domain: store.shop_domain,
        membership_id: pendingMembershipId,
        initiated_at: new Date().toISOString(),
      },
    })

    // Construct the return URL for after Shopify billing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const returnUrl = `${appUrl}/dashboard/memberships/confirm?userId=${userId}&planId=${planId}${sessionId ? `&sessionId=${sessionId}` : ""}`

    // Construct the Shopify billing URL
    const shopifyUrl = `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2023-10"}/recurring_application_charges.json`

    // Create the charge in Shopify
    const response = await fetch(shopifyUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": store.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: plan.name,
          price: plan.price,
          return_url: returnUrl,
          test: process.env.NODE_ENV !== "production", // Use test mode in development
          trial_days: plan.trial_days || 0,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Shopify API error:", errorData)
      return NextResponse.json(
        { error: "Failed to create Shopify billing charge", details: errorData },
        { status: response.status },
      )
    }

    const data = await response.json()
    const charge = data.recurring_application_charge

    // Update the pending membership with the charge ID
    await queryDb(
      `
      UPDATE user_memberships
      SET shopify_charge_id = $1, updated_at = NOW()
      WHERE id = $2
    `,
      [charge.id.toString(), pendingMembershipId],
    )

    // Log the billing charge creation
    await logBillingEvent({
      userId: Number.parseInt(userId),
      eventType: "shopify_billing_charge_created",
      planId: Number.parseInt(planId),
      chargeId: charge.id.toString(),
      status: "pending",
      sessionId: sessionId || null,
      details: {
        charge_id: charge.id,
        confirmation_url: charge.confirmation_url,
        membership_id: pendingMembershipId,
        created_at: new Date().toISOString(),
      },
    })

    // Redirect to Shopify's confirmation URL
    return NextResponse.redirect(charge.confirmation_url)
  } catch (error: any) {
    console.error("Error in start-billing:", error)
    return NextResponse.json({ error: "Failed to start billing process", message: error.message }, { status: 500 })
  }
}
