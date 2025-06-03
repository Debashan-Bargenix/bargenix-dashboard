import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb, beginTransaction, commitTransaction, rollbackTransaction } from "@/lib/db"
import { cookies } from "next/headers"
import crypto from "crypto"

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ""
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ""
const APP_PRODUCTION_URL = "https://dashboard.bargenix.in"

function verifyHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get("hmac")
  if (!hmac) return false
  const map = Object.fromEntries(searchParams.entries())
  delete map.hmac
  const message = Object.keys(map)
    .sort()
    .map((key) => `${key}=${map[key]}`)
    .join("&")
  const generatedHash = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(message).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(generatedHash, "hex"), Buffer.from(hmac, "hex"))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const searchParams = url.searchParams
  const shop = searchParams.get("shop")
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const hmac = searchParams.get("hmac")

  console.log("Shopify callback received:", {
    shop,
    code: code ? "✓" : "✗",
    hmac: hmac ? "✓" : "✗",
    state: state ? "✓" : "✗",
  })

  if (!verifyHmac(searchParams)) {
    console.error("Shopify callback: HMAC verification failed.")
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent("Authentication failed: Invalid signature.")}`,
    )
  }
  console.log("Shopify callback: HMAC verification successful.")

  const storedNonceCookie = cookies().get("shopify_nonce")?.value
  if (!state || !storedNonceCookie || state !== storedNonceCookie) {
    console.error("Shopify callback: Nonce (state) validation failed.", { receivedState: state, storedNonceCookie })
    if (storedNonceCookie) cookies().delete("shopify_nonce")
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent("Authentication failed: Invalid state or session expired.")}`,
    )
  }
  console.log("Shopify callback: Nonce validation successful.")
  cookies().delete("shopify_nonce")

  try {
    await queryDb(`DELETE FROM shopify_nonce_tokens WHERE nonce = $1 AND expires_at > NOW()`, [state])
    console.log("Shopify callback: Nonce validated and attempted deletion from DB.")
  } catch (dbError) {
    console.error("Shopify callback: Error validating/deleting nonce from DB.", dbError)
  }

  const user = await getCurrentUser()
  if (!user || !user.id) {
    console.error("Shopify callback: No authenticated user or user ID found.")
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/login?error=true&message=${encodeURIComponent("Please log in to connect your Shopify store.")}`,
    )
  }
  console.log(`Shopify callback: Authenticated user ID: ${user.id}`)

  if (!shop || !code) {
    console.error("Shopify callback: Missing shop or code parameter.")
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent("Missing required parameters from Shopify.")}`,
    )
  }

  let tokenData: { access_token: string; scope: string; expires_in?: number }
  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code }),
    })
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Shopify callback: Failed to exchange code for token.", {
        status: tokenResponse.status,
        error: errorText,
      })
      return NextResponse.redirect(
        `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent(`Failed to authenticate with Shopify: ${errorText}.`)}`,
      )
    }
    tokenData = await tokenResponse.json()
    console.log("Shopify callback: Token exchange successful.")
  } catch (error) {
    console.error("Shopify callback: Error during token exchange request:", error)
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent("Network error connecting to Shopify.")}`,
    )
  }

  const { access_token, scope: receivedScopes, expires_in } = tokenData
  let expiresAtTimestamp: Date | null = null
  if (typeof expires_in === "number") {
    expiresAtTimestamp = new Date(Date.now() + expires_in * 1000)
    console.log(
      `Shopify callback: Token expires_in: ${expires_in}s, calculated expires_at: ${expiresAtTimestamp.toISOString()}`,
    )
  } else {
    console.log("Shopify callback: Token expires_in not provided or not a number.")
  }

  let shopDetailsFromApi: any
  try {
    const shopResponse = await fetch(
      `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/shop.json`,
      { headers: { "X-Shopify-Access-Token": access_token } },
    )
    if (shopResponse.ok) {
      shopDetailsFromApi = (await shopResponse.json()).shop
    } else {
      shopDetailsFromApi = { name: shop.split(".")[0] }
    }
  } catch (error) {
    shopDetailsFromApi = { name: shop.split(".")[0] }
  }

  try {
    await beginTransaction()
    const existingStoreResult = await queryDb(`SELECT id, user_id FROM shopify_stores WHERE shop_domain = $1`, [shop])
    let storeId

    const storeName = shopDetailsFromApi.name || shop.split(".")[0]
    const storeEmail = shopDetailsFromApi.email || null
    const storeCountry = shopDetailsFromApi.country_code || shopDetailsFromApi.country_name || null
    const storeCurrency = shopDetailsFromApi.currency || null
    const storeTimezone = shopDetailsFromApi.iana_timezone || shopDetailsFromApi.timezone || null
    const storeOwner = shopDetailsFromApi.shop_owner || null
    const storePlanName = shopDetailsFromApi.plan_name || shopDetailsFromApi.plan_display_name || null

    if (existingStoreResult.length > 0) {
      const storeEntry = existingStoreResult[0]
      if (storeEntry.user_id !== user.id) {
        await rollbackTransaction()
        return NextResponse.redirect(
          `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent("This Shopify store is connected to another Bargenix account.")}`,
        )
      }
      storeId = storeEntry.id
      await queryDb(
        `UPDATE shopify_stores SET status = 'active', shop_name = $2, email = $3, country = $4, currency = $5, timezone = $6, owner_name = $7, plan_name = $8, last_status_check = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $9`,
        [
          storeId,
          storeName,
          storeEmail,
          storeCountry,
          storeCurrency,
          storeTimezone,
          storeOwner,
          storePlanName,
          user.id,
        ],
      )
      await queryDb(`DELETE FROM shopify_auth_tokens WHERE store_id = $1`, [storeId])
    } else {
      const newStore = await queryDb(
        `INSERT INTO shopify_stores (user_id, shop_domain, shop_name, email, country, currency, timezone, owner_name, plan_name, status, created_at, updated_at, last_status_check) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW(), NOW()) RETURNING id`,
        [user.id, shop, storeName, storeEmail, storeCountry, storeCurrency, storeTimezone, storeOwner, storePlanName],
      )
      storeId = newStore[0].id
    }

    // Corrected INSERT statement for shopify_auth_tokens
    // It now includes expires_at and relies on DB defaults for created_at and updated_at
    await queryDb(
      `INSERT INTO shopify_auth_tokens (store_id, access_token, scope, expires_at)
   VALUES ($1, $2, $3, $4)`,
      [storeId, access_token, receivedScopes, expiresAtTimestamp],
    )
    console.log(`Shopify callback: New auth token inserted for store ID ${storeId}.`)

    const existingSettings = await queryDb(`SELECT id FROM widget_settings WHERE shop = $1`, [shop])
    if (existingSettings.length === 0) {
      await queryDb(
        `INSERT INTO widget_settings (shop, label, bg_color, text_color, font_size, border_radius, position, updated_at) VALUES ($1, 'Bargain a Deal', '#2E66F8', '#FFFFFF', '16px', '8px', 'bottom_right', NOW())`,
        [shop],
      )
    }

    await commitTransaction()
    console.log("Shopify callback: Database transaction committed.")

    fetch(`${APP_PRODUCTION_URL}/api/shopify/register-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, accessToken: access_token, storeId }),
    }).catch((scriptError) => console.error("Shopify callback: Error queueing script tag registration:", scriptError))

    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?success=true&message=${encodeURIComponent("Shopify store connected successfully!")}&store_id=${storeId}`,
    )
  } catch (dbError: any) {
    console.error("Shopify callback: Database error. Details:", {
      message: dbError.message,
      query: dbError.query,
      stack: dbError.stack,
      errorObject: dbError,
    })
    try {
      await rollbackTransaction()
    } catch (rbError) {
      console.error("Shopify callback: Rollback failed:", rbError)
    }
    const displayError = dbError.message
      ? `Database operation failed: ${dbError.message}`
      : "Database error while connecting your store."
    return NextResponse.redirect(
      `${APP_PRODUCTION_URL}/dashboard/shopify?error=true&message=${encodeURIComponent(displayError)}`,
    )
  }
}
