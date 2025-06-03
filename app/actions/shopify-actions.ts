"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"
import crypto from "crypto"
import { getShopifyAdminApiClient } from "@/lib/shopify-admin-api"

// Environment variables
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ""
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ""
const APP_PRODUCTION_URL = "https://dashboard.bargenix.in" // Use the canonical production URL
//const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" // Should be https://dashboard.bargenix.in in production

// Update scopes to include script_tags and write_script_tags
const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  "read_products,write_products,read_script_tags,write_script_tags,read_themes,write_content,read_shop" // Cleaned up scopes

// Validation schema for shop URL
const shopUrlSchema = z.object({
  shopUrl: z
    .string()
    .min(3, "Shop URL is required")
    .refine((url) => {
      // Basic validation for Shopify store URL
      return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(url)
    }, "Please enter a valid Shopify store URL (e.g., your-store.myshopify.com)"),
})

// Generate a nonce for OAuth
function generateNonce() {
  return crypto.randomBytes(16).toString("hex")
}

// Verify HMAC signature from Shopify
function verifyHmac(query: any) {
  const hmac = query.hmac
  const shop = query.shop

  if (!hmac || !shop) {
    return false
  }

  // Remove hmac from query parameters
  const params = { ...query }
  delete params.hmac

  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")

  // Calculate HMAC
  const calculatedHmac = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(sortedParams).digest("hex")

  return calculatedHmac === hmac
}

// This function is called from app/dashboard/shopify/connect-shopify.tsx
// It should not be used to initiate the primary OAuth flow anymore.
// The primary OAuth flow is now initiated by redirecting to /api/auth.
// This function can remain for other potential uses or be refactored/removed if not needed.
export async function prepareShopifyAuth(formData: FormData) {
  try {
    const rawData = {
      shopUrl: formData.get("shopUrl") as string,
    }

    const validationResult = shopUrlSchema.safeParse(rawData)

    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.errors[0]?.message || "Invalid shop URL",
        authUrl: null,
      }
    }

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in.", authUrl: null }
    }

    const existingShop = await queryDb(`SELECT * FROM shopify_stores WHERE shop_domain = $1 AND user_id != $2`, [
      rawData.shopUrl,
      user.id,
    ])
    if (existingShop.length > 0) {
      return { success: false, message: "This Shopify store is connected to another account.", authUrl: null }
    }

    const nonce = generateNonce()
    await queryDb(
      `INSERT INTO shopify_nonce_tokens (nonce, expires_at) VALUES ($1, NOW() + INTERVAL '5 minutes') ON CONFLICT (nonce) DO UPDATE SET expires_at = NOW() + INTERVAL '5 minutes'`,
      [nonce],
    )
    cookies().set("shopify_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
      path: "/",
      sameSite: "lax",
    })

    // Use the canonical production URL for the redirect URI
    const redirectUri = `${APP_PRODUCTION_URL}/api/shopify/callback`
    const authUrl = `https://${rawData.shopUrl}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES}&redirect_uri=${redirectUri}&state=${nonce}&grant_options[]=per-user`

    return { success: true, authUrl }
  } catch (error: any) {
    console.error("Error preparing Shopify auth (server action):", error)
    return { success: false, message: error.message || "An error occurred.", authUrl: null }
  }
}

// Handle Shopify OAuth callback
export async function handleShopifyCallback(query: any) {
  try {
    // Verify HMAC signature
    if (!verifyHmac(query)) {
      console.error("Shopify Callback: Invalid HMAC signature.")
      return {
        success: false,
        message: "Invalid signature from Shopify.",
      }
    }

    const { shop, code, state } = query
    console.log(`Shopify Callback: Received callback for shop: ${shop}, with state: ${state}`)

    const cookieNonce = cookies().get("shopify_nonce")?.value
    // Also check DB nonce if implemented fully
    const nonceCheckDB = await queryDb(`SELECT * FROM shopify_nonce_tokens WHERE nonce = $1 AND expires_at > NOW()`, [
      state,
    ])

    if (!cookieNonce || cookieNonce !== state || nonceCheckDB.length === 0) {
      console.error(
        `Shopify Callback: Invalid or expired state/nonce. Cookie: ${cookieNonce}, DB found: ${nonceCheckDB.length > 0}`,
      )
      if (cookieNonce) cookies().delete("shopify_nonce")
      if (nonceCheckDB.length > 0) await queryDb(`DELETE FROM shopify_nonce_tokens WHERE nonce = $1`, [state])
      return {
        success: false,
        message: "Authentication failed: Invalid or expired state. Please try connecting again.",
      }
    }

    cookies().delete("shopify_nonce") // Clear cookie nonce
    await queryDb(`DELETE FROM shopify_nonce_tokens WHERE nonce = $1`, [state]) // Clear DB nonce

    const user = await getCurrentUser()
    if (!user) {
      console.error("Shopify Callback: User not logged in during callback.")
      return { success: false, message: "You must be logged in to connect a Shopify store." }
    }
    console.log(`Shopify Callback: User ID ${user.id} is performing connection for shop ${shop}.`)

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(
        `Shopify Callback: Failed to exchange code for access token. Status: ${tokenResponse.status}, Response: ${errorText}`,
      )
      throw new Error(`Failed to get access token: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, scope: receivedScope } = tokenData
    console.log(`Shopify Callback: Access token received for shop ${shop}.`)

    const client = await getShopifyAdminApiClient(shop)
    if (!client) {
      console.error("Shopify Callback: Failed to create Shopify Admin API client.")
      return { success: false, message: "Failed to initialize Shopify connection." }
    }

    const shopDetailsQuery = `{ shop { name email currencyCode ianaTimezone primaryDomain { url } plan { displayName } } }`
    const shopData = await client.graphql(shopDetailsQuery)

    if (!shopData?.shop) {
      console.error("Shopify Callback: Failed to fetch shop details using GraphQL.")
      return { success: false, message: "Failed to fetch shop details from Shopify." }
    }
    const shopDetails = shopData.shop
    console.log(`Shopify Callback: Shop details fetched for ${shop}: ${JSON.stringify(shopDetails)}`)

    await queryDb("BEGIN")
    try {
      const existingShop = await queryDb(`SELECT id, user_id FROM shopify_stores WHERE shop_domain = $1`, [shop])
      let storeId

      if (existingShop.length > 0) {
        if (existingShop[0].user_id !== user.id) {
          await queryDb("ROLLBACK")
          console.warn(
            `Shopify Callback: Shop ${shop} is already connected to user ID ${existingShop[0].user_id}. Current user is ${user.id}.`,
          )
          return { success: false, message: "This Shopify store is already connected to another Bargenix account." }
        }
        storeId = existingShop[0].id
        await queryDb(
          `UPDATE shopify_stores SET user_id = $1, shop_name = $2, email = $3, currency = $4, timezone = $5, owner_name = $6, plan_name = $7, status = 'active', last_status_check = NOW(), updated_at = NOW() WHERE id = $8`,
          [
            user.id,
            shopDetails.name || "",
            shopDetails.email || "",
            shopDetails.currencyCode || "",
            shopDetails.ianaTimezone || "",
            shopDetails.primaryDomain?.url || "",
            shopDetails.plan?.displayName || "",
            storeId,
          ],
        )
        console.log(`Shopify Callback: Updated existing shop record ID: ${storeId} for user ID: ${user.id}`)
      } else {
        const newShopResult = await queryDb(
          `INSERT INTO shopify_stores (user_id, shop_domain, shop_name, email, currency, timezone, owner_name, plan_name, status, last_status_check) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW()) RETURNING id`,
          [
            user.id,
            shop,
            shopDetails.name || "",
            shopDetails.email || "",
            shopDetails.currencyCode || "",
            shopDetails.ianaTimezone || "",
            shopDetails.primaryDomain?.url || "",
            shopDetails.plan?.displayName || "",
          ],
        )
        storeId = newShopResult[0].id
        console.log(`Shopify Callback: Created new shop record ID: ${storeId} for user ID: ${user.id}`)
      }

      await queryDb(`DELETE FROM shopify_auth_tokens WHERE store_id = $1`, [storeId])
      const { access_token, scope: receivedScope, expires_in } = tokenData // tokenData is fetched a few lines above
      let expiresAtTimestamp: Date | null = null
      if (typeof expires_in === "number") {
        expiresAtTimestamp = new Date(Date.now() + expires_in * 1000)
      }

      await queryDb(
        `INSERT INTO shopify_auth_tokens (store_id, access_token, scope, expires_at) VALUES ($1, $2, $3, $4)`,
        [storeId, access_token, receivedScope, expiresAtTimestamp],
      )
      console.log(`Shopify Callback: Stored access token for store ID: ${storeId}`)

      await queryDb("COMMIT")
      console.log(`Shopify Callback: Transaction committed for shop ${shop}.`)

      revalidatePath("/dashboard/shopify")
      return { success: true, message: "Shopify store connected successfully!", storeId }
    } catch (dbError) {
      await queryDb("ROLLBACK")
      console.error("Shopify Callback: Database error during transaction:", dbError)
      throw dbError
    }
  } catch (error: any) {
    console.error("Shopify Callback: General error:", error)
    return { success: false, message: error.message || "An error occurred while connecting to Shopify." }
  }
}

// Get connected Shopify store for a user
export async function getConnectedShopifyStore(userId: number) {
  try {
    const tableExists = await queryDb(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shopify_stores');`,
    )
    if (!tableExists[0].exists) return null

    const storeResult = await queryDb(
      `SELECT s.*, t.access_token FROM shopify_stores s
LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [userId],
    )
    if (storeResult.length === 0) return null

    const store = storeResult[0]
    if (!store.access_token && store.status === "active") {
      await markStoreAsInactive(store.id, "Access token missing - store appears to be uninstalled")
      store.status = "inactive"
    }
    return store
  } catch (error) {
    console.error("Error fetching connected Shopify store:", error)
    return null
  }
}

// Get Shopify store by user ID
export async function getShopifyStoreByUserId(userId: number) {
  try {
    const stores = await queryDb(
      `SELECT s.*, t.access_token, t.scope FROM shopify_stores s
LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.updated_at DESC LIMIT 1`,
      [userId],
    )
    return stores.length > 0 ? stores[0] : null
  } catch (error) {
    console.error("Error fetching Shopify store by user ID:", error)
    throw error
  }
}

// Get all Shopify stores for current user (including inactive)
export async function getAllShopifyStores(userId: number) {
  try {
    const stores = await queryDb(
      `SELECT s.*, t.access_token IS NOT NULL as has_token FROM shopify_stores s
LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
WHERE s.user_id = $1 ORDER BY s.status = 'active' DESC, s.updated_at DESC`,
      [userId],
    )
    return stores
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    throw error
  }
}

// Refresh store data from Shopify API
export async function refreshShopifyStoreData(storeId: number) {
  try {
    const stores = await queryDb(
      `SELECT s.*, t.access_token FROM shopify_stores s
JOIN shopify_auth_tokens t ON s.id = t.store_id WHERE s.id = $1`,
      [storeId],
    )
    if (stores.length === 0) return { success: false, message: "Store not found or access token missing" }

    const store = stores[0]
    if (!store.access_token) {
      await markStoreAsInactive(storeId, "Access token missing during refresh")
      return { success: false, message: "Store connection invalid. Please reconnect." }
    }

    const client = await getShopifyAdminApiClient(store.shop_domain)
    try {
      const query = `{ shop { name email currencyCode ianaTimezone primaryDomain { url } plan { displayName } } }`
      const data = await client.graphql(query)
      if (!data?.shop) throw new Error("Failed to fetch shop details or shop data is null")

      const shopDetails = data.shop
      await queryDb(
        `UPDATE shopify_stores SET shop_name = $1, email = $2, currency = $3, timezone = $4, owner_name = $5, plan_name = $6, status = 'active', last_status_check = NOW(), updated_at = NOW() WHERE id = $7`,
        [
          shopDetails.name || "",
          shopDetails.email || "",
          shopDetails.currencyCode || "",
          shopDetails.ianaTimezone || "",
          shopDetails.primaryDomain?.url || "",
          shopDetails.plan?.displayName || "",
          storeId,
        ],
      )
      revalidatePath("/dashboard/shopify")
      return { success: true, message: "Store data refreshed successfully" }
    } catch (error: any) {
      if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        await markStoreAsInactive(storeId, "Access token invalid during refresh (GraphQL)")
        return { success: false, message: "Store connection invalid. Please reconnect." }
      }
      throw error
    }
  } catch (error: any) {
    if (error.message.includes("Unauthorized") || error.message.includes("401")) {
      // Assuming storeId is available if this outer catch is for an auth issue with the client itself
      // This might not always have storeId if the error is very early.
      // Consider how to get storeId if it's not directly available.
      // For now, assuming storeId is passed in.
      await markStoreAsInactive(storeId, "Access token invalid during refresh (Outer Catch)")
      return { success: false, message: "Store connection invalid. Please reconnect." }
    }
    console.error("Error refreshing store data:", error)
    return { success: false, message: error.message || "Error refreshing store data" }
  }
}

// Redirect to Shopify apps page for uninstallation
export async function redirectToShopifyApps(formData: FormData) {
  try {
    const storeId = Number(formData.get("storeId"))
    const user = await getCurrentUser()
    if (!user) return { success: false, message: "You must be logged in.", redirectUrl: null }

    const stores = await queryDb(`SELECT s.* FROM shopify_stores s WHERE s.id = $1 AND s.user_id = $2`, [
      storeId,
      user.id,
    ])
    if (stores.length === 0)
      return { success: false, message: "Store not found or permission denied.", redirectUrl: null }

    const store = stores[0]
    const nonce = generateNonce()
    await queryDb(`INSERT INTO shopify_nonce_tokens (nonce, expires_at) VALUES ($1, NOW() + INTERVAL '15 minutes')`, [
      nonce,
    ])
    const baseUrl = APP_PRODUCTION_URL.endsWith("/") ? APP_PRODUCTION_URL.slice(0, -1) : APP_PRODUCTION_URL
    const returnUrl = `${baseUrl}/api/shopify/uninstall-callback?store_id=${storeId}&nonce=${nonce}`
    const appsUrl = `https://${store.shop_domain}/admin/settings/apps?return_to=${encodeURIComponent(returnUrl)}`
    return { success: true, redirectUrl: appsUrl, message: "Redirecting to Shopify." }
  } catch (error: any) {
    console.error("Error preparing Shopify redirect for uninstall:", error)
    return { success: false, message: error.message || "Error preparing redirect.", redirectUrl: null }
  }
}

// Mark store as inactive
export async function markStoreAsInactive(storeId: number, reason = "User initiated uninstall") {
  try {
    await queryDb("BEGIN")
    try {
      await queryDb(
        `UPDATE shopify_stores SET status = 'inactive', last_status_check = NOW(), updated_at = NOW() WHERE id = $1`,
        [storeId],
      )
      const existingEvent = await queryDb(
        `SELECT id FROM shopify_uninstall_events WHERE store_id = $1 AND reason = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
        [storeId, reason],
      )
      if (existingEvent.length === 0) {
        await queryDb(`INSERT INTO shopify_uninstall_events (store_id, reason, created_at) VALUES ($1, $2, NOW())`, [
          storeId,
          reason,
        ])
      }
      await queryDb(`DELETE FROM shopify_auth_tokens WHERE store_id = $1`, [storeId])
      await queryDb("COMMIT")
      revalidatePath("/dashboard/shopify")
      return { success: true, message: "Shopify store marked as inactive." }
    } catch (error) {
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error marking store as inactive:", error)
    return { success: false, message: error.message || "Error updating store status." }
  }
}

// Handle the uninstall callback
export async function handleShopifyUninstall(query: any) {
  try {
    const { store_id, nonce } = query
    const nonceCheck = await queryDb(`SELECT * FROM shopify_nonce_tokens WHERE nonce = $1 AND expires_at > NOW()`, [
      nonce,
    ])
    if (nonceCheck.length === 0) return { success: false, message: "Invalid or expired nonce." }

    const user = await getCurrentUser()
    if (!user) return { success: false, message: "You must be logged in." }

    const store = await queryDb(`SELECT * FROM shopify_stores WHERE id = $1 AND user_id = $2`, [store_id, user.id])
    if (store.length === 0) return { success: false, message: "Store not found or permission denied." }

    const result = await markStoreAsInactive(Number(store_id), "User returned from Shopify apps page")
    await queryDb(`DELETE FROM shopify_nonce_tokens WHERE nonce = $1`, [nonce])
    return { success: result.success, message: result.message || "Shopify store status updated." }
  } catch (error: any) {
    console.error("Error handling Shopify uninstall callback:", error)
    return { success: false, message: error.message || "Error updating store status." }
  }
}

// MODIFIED: deleteShopifyStoreData to accept storeId directly
export async function deleteShopifyStoreData(storeId: number) {
  // Changed from FormData to number
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to delete a Shopify store." }
    }

    const store = await queryDb(`SELECT * FROM shopify_stores WHERE id = $1 AND user_id = $2`, [storeId, user.id])
    if (store.length === 0) {
      return { success: false, message: "Store not found or you don't have permission to delete it." }
    }
    const storeDetails = store[0]

    await queryDb("BEGIN")
    try {
      await queryDb(`INSERT INTO shopify_uninstall_events (store_id, reason) VALUES ($1, $2)`, [
        storeId,
        "Store data completely deleted from dashboard",
      ])
      await queryDb(`DELETE FROM shopify_auth_tokens WHERE store_id = $1`, [storeId])
      await queryDb(`DELETE FROM shopify_stores WHERE id = $1`, [storeId])
      await queryDb("COMMIT")
      revalidatePath("/dashboard/shopify")
      return { success: true, message: `Shopify store "${storeDetails.shop_name}" data deleted.` }
    } catch (error) {
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error deleting Shopify store data:", error)
    return { success: false, message: error.message || "Error deleting Shopify store." }
  }
}

// Check if a store is still connected to Shopify
export async function checkShopifyStoreStatus(storeId: number) {
  try {
    const stores = await queryDb(
      `SELECT s.*, t.access_token FROM shopify_stores s
LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id WHERE s.id = $1`,
      [storeId],
    )
    if (stores.length === 0) return { success: false, message: "Store not found.", isConnected: false }

    const store = stores[0]
    if (!store.access_token) {
      await queryDb(`UPDATE shopify_stores SET status = 'inactive', last_status_check = NOW() WHERE id = $1`, [storeId])
      return { success: true, message: "Store disconnected (no access token).", isConnected: false }
    }

    try {
      const client = await getShopifyAdminApiClient(store.shop_domain)
      if (!client) {
        await markStoreAsInactive(storeId, "Failed to initialize Shopify client for status check")
        return { success: false, message: "Failed to connect to Shopify for status check.", isConnected: false }
      }
      const gqlQuery = `{ shop { name } }`
      const data = await client.graphql(gqlQuery)

      if (data?.shop) {
        await queryDb(`UPDATE shopify_stores SET status = 'active', last_status_check = NOW() WHERE id = $1`, [storeId])
        return { success: true, message: "Store is connected.", isConnected: true }
      } else {
        await markStoreAsInactive(storeId, "Token valid but no shop data returned during status check")
        return { success: true, message: "Store disconnected (unexpected Shopify response).", isConnected: false }
      }
    } catch (error: any) {
      if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        await markStoreAsInactive(storeId, "Token invalid - detected during status check (GraphQL)")
        return { success: true, message: "Store disconnected (invalid token).", isConnected: false }
      }
      return { success: false, message: "API error checking status.", isConnected: false, error: error.message }
    }
  } catch (error: any) {
    console.error("Error checking Shopify store status:", error)
    // If storeId is available, we could try to mark as inactive, but it might be a broader DB issue.
    // For now, just rethrow or return a generic error.
    return { success: false, message: error.message || "Failed to check store status.", isConnected: false }
  }
}

// Fetch products from Shopify store
export async function fetchShopifyProducts(storeId: number, limit = 10) {
  try {
    const stores = await queryDb(
      `SELECT s.shop_domain, t.access_token FROM shopify_stores s
JOIN shopify_auth_tokens t ON s.id = t.store_id WHERE s.id = $1`,
      [storeId],
    )
    if (stores.length === 0) throw new Error("Store not found or access token missing")

    const { shop_domain } = stores[0]
    const client = await getShopifyAdminApiClient(shop_domain)
    if (!client) throw new Error("Failed to create Shopify Admin API client")

    const query = `query GetProducts($numProducts: Int!) { products(first: $numProducts) { edges { node { id title } } } }`
    const data = await client.graphql(query, { numProducts: limit })
    if (!data?.products?.edges) throw new Error("Failed to fetch products from Shopify")
    return data.products.edges.map((edge: any) => edge.node)
  } catch (error: any) {
    console.error("Error fetching Shopify products:", error)
    // Consider specific error handling for auth vs other issues
    if (error.message.includes("Unauthorized") || error.message.includes("401")) {
      // Potentially mark store as inactive if storeId is known and error is auth-related
    }
    throw error // Re-throw to be handled by caller
  }
}

// Script Tag Management
export async function installScriptTag() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "You must be logged in." }
    const store = await getShopifyStoreByUserId(user.id)
    if (!store || !store.access_token)
      return { success: false, error: "No connected Shopify store with valid token found." }

    const appUrl = APP_PRODUCTION_URL
    const scriptUrl = `${appUrl}/bargain-button-direct.js?v=${Date.now()}`

    const response = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/script_tags.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": store.access_token },
        body: JSON.stringify({ script_tag: { event: "onload", src: scriptUrl, display_scope: "online_store" } }),
      },
    )
    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: `Failed to install script tag: ${JSON.stringify(errorData.errors || errorData)}` }
    }
    const data = await response.json()
    return { success: true, scriptTag: data.script_tag }
  } catch (error: any) {
    console.error("Error installing script tag:", error)
    return { success: false, error: error.message || "Unknown error installing script tag." }
  }
}

export async function uninstallScriptTag() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "You must be logged in." }
    const store = await getShopifyStoreByUserId(user.id)
    if (!store || !store.access_token)
      return { success: false, error: "No connected Shopify store with valid token found." }

    const response = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/script_tags.json`,
      {
        headers: { "X-Shopify-Access-Token": store.access_token },
      },
    )
    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: `Failed to fetch script tags: ${JSON.stringify(errorData.errors || errorData)}` }
    }
    const data = await response.json()
    const scriptTags = data.script_tags || []

    const appUrlIdentifier = "dashboard.bargenix.in" // More robust identifier
    const ourScriptTags = scriptTags.filter((tag: any) => tag.src.includes(appUrlIdentifier))
    let uninstalledCount = 0

    for (const tag of ourScriptTags) {
      const deleteResponse = await fetch(
        `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/script_tags/${tag.id}.json`,
        {
          method: "DELETE",
          headers: { "X-Shopify-Access-Token": store.access_token },
        },
      )
      if (deleteResponse.ok) {
        uninstalledCount++
      } else {
        console.error(`Failed to delete script tag ${tag.id}: ${await deleteResponse.text()}`)
      }
    }
    // Cleanup script logic (optional, can be complex to manage self-deletion)
    // ...
    return { success: true, message: `Uninstalled ${uninstalledCount} script tags.` }
  } catch (error: any) {
    console.error("Error uninstalling script tag:", error)
    return { success: false, error: error.message || "Unknown error uninstalling script tag." }
  }
}

export async function checkScriptTag() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "You must be logged in.", installed: false }
    const store = await getShopifyStoreByUserId(user.id)
    if (!store || !store.access_token)
      return { success: false, error: "No connected Shopify store with valid token found.", installed: false }

    const response = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/script_tags.json`,
      {
        headers: { "X-Shopify-Access-Token": store.access_token },
      },
    )
    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: `Failed to fetch script tags: ${JSON.stringify(errorData.errors || errorData)}`,
        installed: false,
      }
    }
    const data = await response.json()
    const scriptTags = data.script_tags || []
    const appUrlIdentifier = "dashboard.bargenix.in"
    const ourScriptTags = scriptTags.filter((tag: any) => tag.src.includes(appUrlIdentifier))
    return { success: true, installed: ourScriptTags.length > 0, scriptTags: ourScriptTags }
  } catch (error: any) {
    console.error("Error checking script tag status:", error)
    return { success: false, error: error.message || "Unknown error checking script tags.", installed: false }
  }
}

// Theme related functions
export async function getShopifyThemeId() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Not authenticated" }
    const store = await getShopifyStoreByUserId(user.id)
    if (!store || !store.access_token) return { success: false, error: "No Shopify store connected or token missing" }

    const themesResponse = await fetch(
      `https://${store.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-04"}/themes.json`,
      {
        headers: { "X-Shopify-Access-Token": store.access_token, "Content-Type": "application/json" },
      },
    )
    if (!themesResponse.ok) {
      console.error("Failed to fetch themes:", await themesResponse.text())
      return { success: false, error: "Failed to fetch themes" }
    }
    const themesData = await themesResponse.json()
    const mainTheme = themesData.themes.find((theme: any) => theme.role === "main")
    if (!mainTheme) return { success: false, error: "No main theme found" }
    return { success: true, themeId: mainTheme.id, themeName: mainTheme.name }
  } catch (error: any) {
    console.error("Error getting Shopify theme ID:", error)
    return { success: false, error: error.message || "Failed to get theme ID" }
  }
}

export async function openShopifyThemeEditor() {
  // This function likely needs to return a URL for client-side redirect,
  // or be called from a client component that handles the redirect.
  // Server actions cannot directly perform browser redirects without client interaction.
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Not authenticated", url: null }
    const store = await getShopifyStoreByUserId(user.id)
    if (!store) return { success: false, error: "No Shopify store connected", url: null }

    const themeResult = await getShopifyThemeId() // This already uses getShopifyStoreByUserId
    if (!themeResult.success || !themeResult.themeId)
      return { success: false, error: themeResult.error || "Could not get theme ID", url: null }

    const editorUrl = `https://${store.shop_domain}/admin/themes/${themeResult.themeId}/editor`
    return { success: true, url: editorUrl }
  } catch (error: any) {
    console.error("Error opening Shopify theme editor:", error)
    return { success: false, error: error.message || "Failed to open theme editor", url: null }
  }
}

// Placeholder for other functions
export async function createEnhancedWidget() {
  /* ... */ return { success: true }
}
export async function testButtonVisibility() {
  /* ... */ return { success: true, visible: true }
}
export async function checkAndUpdateStoreStatus(userId: number) {
  /* ... */ return { success: true }
}
