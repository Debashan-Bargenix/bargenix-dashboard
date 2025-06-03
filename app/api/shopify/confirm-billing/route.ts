import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { confirmShopifyBilling } from "@/app/actions/membership-actions"
import { logBillingEvent } from "@/lib/billing-logger"

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const chargeId = searchParams.get("charge_id")
  const planId = searchParams.get("planId")
  const userId = searchParams.get("userId")
  const sessionId = searchParams.get("sessionId") || undefined

  if (!chargeId) {
    return NextResponse.json({ error: "Missing charge_id parameter" }, { status: 400 })
  }
  if (!planId) {
    return NextResponse.json({ error: "Missing planId parameter" }, { status: 400 })
  }
  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
  }

  try {
    // Log the confirmation attempt
    await logBillingEvent({
      userId: Number(userId),
      eventType: "shopify_billing_confirmation_attempt",
      planId: Number(planId),
      chargeId: chargeId,
      status: "pending",
      sessionId: sessionId,
      details: {
        attempted_at: new Date().toISOString(),
      },
    })

    // Get the store information
    const storeResult = await queryDb(
      `
      SELECT * FROM shopify_stores 
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId],
    )

    if (storeResult.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=shopify_not_connected&message=Your Shopify store is not connected. Please connect your store first.`,
      )
    }

    const store = storeResult[0]

    // Get Shopify access token
    const tokenResult = await queryDb(
      `
      SELECT access_token FROM shopify_auth_tokens
      WHERE user_id = $1 AND shop_domain = $2
      ORDER BY created_at DESC LIMIT 1
      `,
      [userId, store.shop_domain],
    )

    if (tokenResult.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=shopify_not_connected&message=Your Shopify access token is missing. Please reconnect your store.`,
      )
    }

    const accessToken = tokenResult[0].access_token

    // Verify the charge with Shopify
    const shopifyResponse = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${chargeId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    )

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.text()
      console.error("Shopify API error:", errorData)

      // Log the error
      await logBillingEvent({
        userId: Number(userId),
        eventType: "shopify_billing_verification_error",
        planId: Number(planId),
        chargeId: chargeId,
        status: "error",
        sessionId: sessionId,
        details: {
          error: errorData,
          status_code: shopifyResponse.status,
          error_at: new Date().toISOString(),
        },
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=shopify_api_error&message=There was an error verifying your subscription with Shopify.`,
      )
    }

    const responseData = await shopifyResponse.json()
    const charge = responseData.recurring_application_charge

    // Check if the charge is accepted
    if (charge.status !== "accepted") {
      // Log the declined charge
      await logBillingEvent({
        userId: Number(userId),
        eventType: "shopify_charge_declined",
        planId: Number(planId),
        chargeId: chargeId,
        status: "declined",
        sessionId: sessionId,
        details: {
          charge_status: charge.status,
          declined_at: new Date().toISOString(),
        },
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=billing_declined&message=Your subscription was not approved.`,
      )
    }

    // Activate the charge with Shopify
    const activateResponse = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${chargeId}/activate.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recurring_application_charge: {
            id: chargeId,
          },
        }),
      },
    )

    if (!activateResponse.ok) {
      const errorData = await activateResponse.text()
      console.error("Shopify API activation error:", errorData)

      // Log the error
      await logBillingEvent({
        userId: Number(userId),
        eventType: "shopify_charge_activation_error",
        planId: Number(planId),
        chargeId: chargeId,
        status: "error",
        sessionId: sessionId,
        details: {
          error: errorData,
          status_code: activateResponse.status,
          error_at: new Date().toISOString(),
        },
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=billing_activation_failed&message=There was an error activating your subscription.`,
      )
    }

    // Log the successful activation
    await logBillingEvent({
      userId: Number(userId),
      eventType: "shopify_charge_activated",
      planId: Number(planId),
      chargeId: chargeId,
      status: "active",
      sessionId: sessionId,
      details: {
        activated_at: new Date().toISOString(),
      },
    })

    // Confirm the billing in our system
    const result = await confirmShopifyBilling(Number(userId), Number(planId), chargeId)

    if (!result.success) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=billing_failed&message=${result.message || "There was an error processing your billing request."}`,
      )
    }

    // Get plan details for the success message
    const planResult = await queryDb(
      `
      SELECT * FROM membership_plans WHERE id = $1
      `,
      [planId],
    )

    const planName = planResult.length > 0 ? planResult[0].name : "upgraded plan"

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?success=true&plan=${planId}&name=${planName}`,
    )
  } catch (error) {
    console.error("Error confirming Shopify billing:", error)

    // Log the error
    await logBillingEvent({
      userId: Number(userId),
      eventType: "shopify_billing_confirmation_error",
      planId: Number(planId),
      chargeId: chargeId,
      status: "error",
      sessionId: sessionId,
      details: {
        error: error.message || "Unknown error",
        error_at: new Date().toISOString(),
      },
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/memberships?error=billing_failed&message=An unexpected error occurred while processing your subscription.`,
    )
  }
}
