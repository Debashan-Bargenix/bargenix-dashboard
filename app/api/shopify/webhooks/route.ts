import type { NextRequest } from "next/server"
import crypto from "crypto"
import { neon } from "@neondatabase/serverless"
import { logBillingEvent } from "@/lib/billing-logger" // Adjust path if necessary

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ""

async function verifyShopifyWebhook(request: NextRequest, rawBody: string) {
  const hmac = request.headers.get("x-shopify-hmac-sha256")
  const shop = request.headers.get("x-shopify-shop-domain")
  const topic = request.headers.get("x-shopify-topic")

  if (!hmac || !shop || !topic) {
    console.warn("Webhook missing required headers", { hmac, shop, topic })
    return { success: false, error: "Missing required headers", status: 401 }
  }

  const calculatedHmac = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(rawBody, "utf8").digest("base64")

  if (calculatedHmac !== hmac) {
    console.warn("Webhook HMAC verification failed", { calculatedHmac, hmac, shop, topic })
    return { success: false, error: "Invalid webhook signature", status: 401 }
  }

  return { success: true, shop, topic, status: 200 }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text() // Read body once for verification and parsing

  const verificationResult = await verifyShopifyWebhook(request, rawBody)
  if (!verificationResult.success) {
    return new Response(verificationResult.error, { status: verificationResult.status })
  }

  const { shop, topic } = verificationResult
  let data
  try {
    data = JSON.parse(rawBody)
  } catch (e) {
    console.error("Failed to parse webhook body:", e, { rawBody })
    return new Response("Invalid JSON body", { status: 400 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log(`Received webhook: Topic: ${topic}, Shop: ${shop}`)

    switch (topic) {
      case "app/uninstalled": {
        console.log(`Processing app/uninstalled webhook for shop: ${shop}`)
        const stores = await sql`
          SELECT id, user_id FROM shopify_stores WHERE shop_domain = ${shop}
        `
        if (stores.length === 0) {
          console.warn(`Shop not found for app/uninstalled webhook: ${shop}`)
          // Still return 200 as Shopify expects acknowledgment
          return new Response("Shop not found but webhook acknowledged", { status: 200 })
        }
        const storeId = stores[0].id
        const userId = stores[0].user_id

        await sql.begin(async (tx) => {
          await tx`
            UPDATE user_memberships
            SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
            WHERE user_id = ${userId} AND status = 'active'
          `
          await tx`
            UPDATE shopify_stores
            SET status = 'inactive', last_status_check = NOW(), updated_at = NOW()
            WHERE id = ${storeId}
          `
          // Ensure shopify_uninstall_events table exists and has user_id and details columns
          await tx`
            INSERT INTO shopify_uninstall_events (
              store_id, user_id, reason, details, created_at
            ) VALUES (
              ${storeId}, ${userId}, 'app_uninstalled_webhook', ${data}::jsonb, NOW()
            )
            ON CONFLICT (store_id, reason) DO UPDATE SET details = EXCLUDED.details, user_id = EXCLUDED.user_id, updated_at = NOW()
          `
          await tx`DELETE FROM shopify_auth_tokens WHERE store_id = ${storeId}`
        })
        await logBillingEvent(userId, "app_uninstalled", null, null, null, null, "cancelled", {
          shop_domain: shop,
          uninstalled_at: new Date().toISOString(),
          webhook_payload: data,
        })
        console.log(`Processed app/uninstalled for shop: ${shop}, user_id: ${userId}`)
        break
      }

      // Mandatory Compliance Webhooks
      case "customers/data_request": {
        console.log(
          `GDPR customers/data_request for shop: ${shop}, Customer ID: ${data.customer?.id}, Orders Requested: ${data.orders_requested?.join(", ")}`,
        )
        // TODO: Implement actual data retrieval and provision to the merchant.
        // For now, just acknowledge.
        // Example: Log this request to a table for processing.
        // await sql`INSERT INTO gdpr_requests (shop_id, shop_domain, type, customer_details, orders_requested, payload, status, received_at)
        //           VALUES (${data.shop_id}, ${data.shop_domain}, 'customer_data_request', ${data.customer}::jsonb, ${data.orders_requested}::jsonb, ${data}::jsonb, 'pending', NOW())`;
        console.log(`Acknowledged customers/data_request for shop: ${shop}`)
        break
      }

      case "customers/redact": {
        console.log(
          `GDPR customers/redact for shop: ${shop}, Customer ID: ${data.customer?.id}, Orders to Redact: ${data.orders_to_redact?.join(", ")}`,
        )
        // TODO: Implement actual data redaction logic.
        // For now, just acknowledge.
        // Example: Log this request and trigger a redaction process.
        // await sql`INSERT INTO gdpr_requests (shop_id, shop_domain, type, customer_details, orders_to_redact, payload, status, received_at)
        //           VALUES (${data.shop_id}, ${data.shop_domain}, 'customer_redact', ${data.customer}::jsonb, ${data.orders_to_redact}::jsonb, ${data}::jsonb, 'pending_redaction', NOW())`;
        console.log(`Acknowledged customers/redact for shop: ${shop}`)
        break
      }

      case "shop/redact": {
        console.log(`GDPR shop/redact for shop: ${shop}, Shop ID: ${data.shop_id}`)
        // TODO: Implement actual shop data redaction logic. This typically means deleting all data associated with the shop.
        // The app/uninstalled logic already handles some parts (tokens, store status).
        // You might need more comprehensive deletion here after 48 hours.
        // For now, just acknowledge.
        // Example: Log this request and trigger a shop data deletion process.
        // await sql`INSERT INTO gdpr_requests (shop_id, shop_domain, type, payload, status, received_at)
        //           VALUES (${data.shop_id}, ${data.shop_domain}, 'shop_redact', ${data}::jsonb, 'pending_redaction', NOW())`;

        // Optionally, re-trigger parts of the uninstall logic if it's safe and idempotent
        const stores = await sql`
          SELECT id, user_id FROM shopify_stores WHERE shop_domain = ${shop} AND id = ${data.shop_id}
        `
        if (stores.length > 0) {
          const storeId = stores[0].id
          const userId = stores[0].user_id
          console.log(`Shop/redact: Found store ${storeId} for user ${userId}. Consider full data wipe.`)
          // Add more comprehensive data deletion logic here if needed, beyond what app/uninstalled does.
          // For example, deleting all related analytics, settings, etc.
          await sql`
            INSERT INTO shopify_uninstall_events (
              store_id, user_id, reason, details, created_at
            ) VALUES (
              ${storeId}, ${userId}, 'shop_redact_webhook', ${data}::jsonb, NOW()
            )
            ON CONFLICT (store_id, reason) DO UPDATE SET details = EXCLUDED.details, user_id = EXCLUDED.user_id, updated_at = NOW()
          `
        } else {
          console.warn(`Shop/redact: Shop ${shop} (ID: ${data.shop_id}) not found or ID mismatch.`)
        }
        console.log(`Acknowledged shop/redact for shop: ${shop}`)
        break
      }

      default:
        console.log(`Received unhandled webhook topic: ${topic} for shop: ${shop}`)
    }

    return new Response("Webhook processed successfully", { status: 200 })
  } catch (error: any) {
    console.error("Error processing webhook:", {
      errorMessage: error.message,
      errorStack: error.stack,
      topic,
      shop,
      payload: data, // Log the parsed payload on error
    })
    // Still return 200 if possible to prevent Shopify from resending too often,
    // unless it's a critical parsing or auth error handled earlier.
    return new Response("Internal server error during webhook processing", { status: 500 })
  }
}
