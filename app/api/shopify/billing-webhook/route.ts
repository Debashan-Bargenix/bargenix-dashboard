import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"
import { logBillingEvent, logBillingError } from "@/lib/billing-logger"

export async function POST(req: NextRequest) {
  try {
    // Verify Shopify webhook
    const hmac = req.headers.get("x-shopify-hmac-sha256")
    const topic = req.headers.get("x-shopify-topic")
    const shopDomain = req.headers.get("x-shopify-shop-domain")

    if (!hmac || !topic || !shopDomain) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 })
    }

    // Get the request body as text for HMAC verification
    const body = await req.text()

    // Verify the HMAC
    const generated = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(body).digest("base64")

    if (generated !== hmac) {
      return NextResponse.json({ error: "HMAC verification failed" }, { status: 401 })
    }

    // Parse the body
    const data = JSON.parse(body)

    // Handle different webhook topics
    const sql = neon(process.env.DATABASE_URL!)

    switch (topic) {
      case "application_charges/update":
      case "recurring_application_charges/update": {
        const charge = data.recurring_application_charge || data.application_charge
        const chargeId = charge.id.toString()

        // Find the membership with this charge ID
        const memberships = await sql`
      SELECT um.*, mp.slug as plan_slug, mp.price
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.shopify_charge_id = ${chargeId}
    `

        if (memberships.length === 0) {
          return NextResponse.json({ error: "Membership not found" }, { status: 404 })
        }

        const membership = memberships[0]
        const userId = membership.user_id

        // Update the membership status based on the charge status
        let newStatus
        switch (charge.status) {
          case "active":
            newStatus = "active"
            break
          case "cancelled":
            newStatus = "cancelled"
            break
          case "declined":
            newStatus = "cancelled"
            break
          case "expired":
            newStatus = "cancelled"
            break
          default:
            newStatus = membership.status // Keep the current status
        }

        if (newStatus !== membership.status) {
          // Begin transaction
          await sql.begin(async (tx) => {
            if (newStatus === "active") {
              // Cancel any existing active memberships
              await tx`
            UPDATE user_memberships
            SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
            WHERE user_id = ${userId} AND status = 'active' AND id != ${membership.id}
          `
            }

            // Update the membership status
            await tx`
          UPDATE user_memberships
          SET status = ${newStatus}, updated_at = NOW()
          ${newStatus === "cancelled" ? sql`, end_date = NOW()` : sql``}
          WHERE id = ${membership.id}
        `

            // Add to membership history
            await tx`
          INSERT INTO membership_history (
            user_id, plan_id, action, details, created_at
          ) VALUES (
            ${userId}, 
            ${membership.plan_id}, 
            ${newStatus === "active" ? "activated" : "cancelled"}, 
            ${JSON.stringify({
              charge_id: chargeId,
              price: membership.price,
              plan_slug: membership.plan_slug,
              shopify_status: charge.status,
            })}::jsonb, 
            NOW()
          )
        `
          })

          // Log the event
          await logBillingEvent(
            userId,
            `membership_${newStatus}`,
            chargeId,
            membership.plan_id,
            membership.plan_slug,
            membership.price,
            newStatus,
            {
              shopify_status: charge.status,
              webhook_topic: topic,
              charge_data: charge,
            },
          )
        }

        break
      }

      default:
        // Log unknown webhook topics
        await logBillingError(
          "system",
          "unknown_webhook",
          "/api/shopify/billing-webhook",
          { topic, shop_domain: shopDomain },
          null,
          { error: "Unknown webhook topic" },
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing billing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
