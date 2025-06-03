"use server"

import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import {
  fetchShopifyInventory,
  getConnectedStoreId,
  getCategoryBreakdown,
  syncShopifyInventory,
  getLastSyncInfo,
} from "./shopify-inventory-actions"
import { getUserBargainingLimits } from "./bargaining-actions"
import { neon } from "@neondatabase/serverless"
import { getUserMembership } from "./membership-actions"

// Get Shopify store data
export async function getShopifyStoreData() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return null
    }

    const stores = await queryDb(
      `SELECT s.*, t.access_token 
       FROM shopify_stores s
       LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.updated_at DESC
       LIMIT 1`,
      [user.id],
    )

    if (stores.length === 0) {
      return null
    }

    return {
      id: stores[0].id,
      shopDomain: stores[0].shop_domain,
      status: stores[0].status,
      hasAccessToken: !!stores[0].access_token,
    }
  } catch (error) {
    console.error("Error getting Shopify store data:", error)
    return null
  }
}

// Get inventory data
export async function getInventoryData() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    const storeId = await getConnectedStoreId()

    if (!storeId) {
      return null
    }

    // Get products with inventory - this is the key function that fetches real-time data
    const products = await fetchShopifyInventory(storeId)

    console.log(`Fetched ${products.length} products from Shopify`)

    // Get the currency from the first product, or default to USD
    const currency = products.length > 0 ? products[0].currency || "USD" : "USD"

    // Get categories
    const categories = await getCategoryBreakdown()

    // Calculate total value
    let totalValue = 0
    for (const product of products) {
      for (const variant of product.variants) {
        totalValue += (Number.parseFloat(variant.price) || 0) * (variant.inventory_quantity || 0)
      }
    }

    // Get last sync time
    const lastSyncInfo = await getLastSyncInfo()
    const lastSynced = lastSyncInfo?.startedAt || null

    // Get bargaining settings for each product
    const bargainingSettingsQuery = `
      SELECT product_id, bargaining_enabled, min_price, behavior
      FROM product_bargaining_settings
      WHERE user_id = $1
    `

    const bargainingSettings = await queryDb(bargainingSettingsQuery, [user.id])

    // Create a map for quick lookup
    const settingsMap = {}
    for (const setting of bargainingSettings) {
      settingsMap[setting.product_id] = {
        bargainingEnabled: setting.bargaining_enabled,
        minPrice: Number.parseFloat(setting.min_price),
        behavior: setting.behavior,
      }
    }

    // Add bargaining settings to products
    const productsWithSettings = products.map((product) => {
      const settings = settingsMap[product.id] || {
        bargainingEnabled: false,
        minPrice: 0,
        behavior: "normal",
      }

      return {
        ...product,
        bargainingEnabled: settings.bargainingEnabled,
        minPrice: settings.minPrice,
        behavior: settings.behavior,
      }
    })

    // Count products with bargaining enabled
    const bargainingEnabledCount = productsWithSettings.filter((p) => p.bargainingEnabled).length

    // Get user membership data
    const membership = await getUserMembership(user.id)
    const bargainingLimits = await getUserBargainingLimits()

    // Format membership data
    const membershipData = {
      name: membership?.name || "Free",
      productsAllowed: bargainingLimits?.maxProducts || 0,
      productsUsed: bargainingLimits?.currentlyEnabled || 0,
    }

    return {
      products: productsWithSettings,
      categories,
      totalProducts: products.length,
      totalVariants: products.reduce((sum, product) => sum + product.variants.length, 0),
      totalInventory: products.reduce(
        (sum, product) =>
          sum + product.variants.reduce((varSum, variant) => varSum + (variant.inventory_quantity || 0), 0),
        0,
      ),
      totalValue,
      lastSynced,
      bargainingEnabled: bargainingEnabledCount,
      membership: membershipData,
      currency,
    }
  } catch (error) {
    console.error("Error getting inventory data:", error)
    return null
  }
}

// Get bargaining limits
export async function getBargainingLimits() {
  try {
    return await getUserBargainingLimits()
  } catch (error) {
    console.error("Error getting bargaining limits:", error)
    return null
  }
}

// Sync inventory data
export async function syncInventoryData() {
  try {
    return await syncShopifyInventory()
  } catch (error) {
    console.error("Error syncing inventory data:", error)
    return {
      success: false,
      message: "Failed to sync inventory data",
    }
  }
}

// Save bargaining settings for a product
export async function saveBargainingSettings(
  productId: string,
  variantId: string | null,
  enabled: boolean,
  minPrice: number,
  behavior: string,
) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    const userId = user.id

    // Check if the user has reached their limit
    if (enabled) {
      const limits = await getBargainingLimits()
      if (limits && limits.maxProducts > 0 && limits.currentlyEnabled >= limits.maxProducts) {
        // Check if this product is already enabled
        const existingSettings = await neon(process.env.DATABASE_URL!)`
          SELECT id FROM product_bargaining_settings 
          WHERE user_id = ${userId} 
          AND product_id = ${productId} 
          AND variant_id ${variantId ? neon(process.env.DATABASE_URL!)`= ${variantId}` : neon(process.env.DATABASE_URL!)`IS NULL`} 
          AND bargaining_enabled = true
        `

        if (!existingSettings || existingSettings.length === 0) {
          return {
            success: false,
            message:
              "You have reached your bargaining product limit. Please upgrade your membership to enable more products.",
          }
        }
      }
    }

    // Check if settings already exist for this product/variant
    const existingSettings = await neon(process.env.DATABASE_URL!)`
      SELECT id FROM product_bargaining_settings 
      WHERE user_id = ${userId} 
      AND product_id = ${productId} 
      AND variant_id ${variantId ? neon(process.env.DATABASE_URL!)`= ${variantId}` : neon(process.env.DATABASE_URL!)`IS NULL`}
    `

    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      await neon(process.env.DATABASE_URL!)`
        UPDATE product_bargaining_settings 
        SET bargaining_enabled = ${enabled}, 
            min_price = ${minPrice}, 
            behavior = ${behavior}, 
            updated_at = NOW() 
        WHERE user_id = ${userId} 
        AND product_id = ${productId} 
        AND variant_id ${variantId ? neon(process.env.DATABASE_URL!)`= ${variantId}` : neon(process.env.DATABASE_URL!)`IS NULL`}
      `
    } else {
      // Insert new settings
      await neon(process.env.DATABASE_URL!)`
        INSERT INTO product_bargaining_settings 
        (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at) 
        VALUES (
          ${userId}, 
          ${productId}, 
          ${variantId}, 
          ${enabled}, 
          ${minPrice}, 
          ${behavior}, 
          NOW()
        )
      `
    }

    return {
      success: true,
      message: "Bargaining settings saved successfully",
    }
  } catch (error) {
    console.error("Error saving bargaining settings:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save bargaining settings",
    }
  }
}

// Bulk update bargaining settings
export async function bulkUpdateBargainingSettings(
  categoryFilter: string | null,
  enabled: boolean,
  minPricePercentage: number,
  behavior: string,
  limit: number | null,
) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    const userId = user.id

    // Get connected store
    const storeResult = await neon(process.env.DATABASE_URL!)`
      SELECT id FROM shopify_stores 
      WHERE user_id = ${userId} 
      AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (!storeResult || storeResult.length === 0) {
      return {
        success: false,
        message: "No active Shopify store connected",
      }
    }

    const storeId = storeResult[0].id

    // Check if the user has reached their limit
    if (enabled) {
      const limits = await getBargainingLimits()
      if (limits && limits.maxProducts > 0) {
        // Count how many products would be affected
        let countQuery = neon(process.env.DATABASE_URL!)`
          SELECT COUNT(DISTINCT p.shopify_id) as count
          FROM shopify_products p
          LEFT JOIN product_bargaining_settings b 
            ON p.shopify_id = b.product_id AND b.user_id = ${userId}
          WHERE p.store_id = ${storeId} 
          AND p.status = 'active'
        `

        if (categoryFilter) {
          countQuery = neon(process.env.DATABASE_URL!)`
            ${countQuery} AND p.product_type = ${categoryFilter}
          `
        }

        // Exclude products that already have bargaining enabled
        countQuery = neon(process.env.DATABASE_URL!)`
          ${countQuery} AND (b.bargaining_enabled IS NULL OR b.bargaining_enabled = false)
        `

        const countResult = await countQuery
        const newEnabledCount = Number.parseInt(countResult[0]?.count || "0", 10)

        if (limits.currentlyEnabled + newEnabledCount > limits.maxProducts) {
          return {
            success: false,
            message: `You can only enable ${limits.maxProducts - limits.currentlyEnabled} more products for bargaining. Please upgrade your membership to enable more products.`,
          }
        }
      }
    }

    // Get products to update
    let productsQuery = neon(process.env.DATABASE_URL!)`
      SELECT shopify_id, variants
      FROM shopify_products
      WHERE store_id = ${storeId} 
      AND status = 'active'
    `

    if (categoryFilter) {
      productsQuery = neon(process.env.DATABASE_URL!)`
        ${productsQuery} AND product_type = ${categoryFilter}
      `
    }

    productsQuery = neon(process.env.DATABASE_URL!)`
      ${productsQuery} ORDER BY title ASC
    `

    if (limit) {
      productsQuery = neon(process.env.DATABASE_URL!)`
        ${productsQuery} LIMIT ${limit}
      `
    }

    const products = await productsQuery

    // Process each product
    let updatedCount = 0
    for (const product of products) {
      let variants = []

      try {
        if (product.variants && typeof product.variants === "string") {
          variants = JSON.parse(product.variants)
        } else if (Array.isArray(product.variants)) {
          variants = product.variants
        } else if (typeof product.variants === "object") {
          variants = product.variants
        }
      } catch (e) {
        console.error("Error parsing variants:", e)
        variants = []
      }

      // Update settings for each variant
      for (const variant of variants) {
        const minPrice = Number.parseFloat(variant.price || "0") * (minPricePercentage / 100)

        // Use GID format for both product_id and variant_id
        const productGid = product.shopify_id.startsWith("gid://")
          ? product.shopify_id
          : `gid://shopify/Product/${product.shopify_id}`
        const variantGid = variant.id.startsWith("gid://") ? variant.id : `gid://shopify/ProductVariant/${variant.id}`

        const existingSettings = await neon(process.env.DATABASE_URL!)`
          SELECT id FROM product_bargaining_settings 
          WHERE user_id = ${userId} 
          AND product_id = ${productGid} 
          AND variant_id = ${variantGid}
        `

        if (existingSettings && existingSettings.length > 0) {
          await neon(process.env.DATABASE_URL!)`
            UPDATE product_bargaining_settings 
            SET bargaining_enabled = ${enabled}, 
                min_price = ${minPrice}, 
                behavior = ${behavior}, 
                updated_at = NOW() 
            WHERE user_id = ${userId} 
            AND product_id = ${productGid} 
            AND variant_id = ${variantGid}
          `
        } else {
          await neon(process.env.DATABASE_URL!)`
            INSERT INTO product_bargaining_settings 
            (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at) 
            VALUES (
              ${userId}, 
              ${productGid}, 
              ${variantGid}, 
              ${enabled}, 
              ${minPrice}, 
              ${behavior}, 
              NOW()
            )
          `
        }
      }

      updatedCount++
    }

    return {
      success: true,
      message: `Bargaining settings updated for ${updatedCount} products`,
      updatedCount,
    }
  } catch (error) {
    console.error("Error updating bargaining settings:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update bargaining settings",
    }
  }
}
