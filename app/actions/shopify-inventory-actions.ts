"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getShopifyAdminApiClient } from "@/lib/shopify-admin-api"

// Fetch detailed products with variants and inventory from Shopify
export async function fetchShopifyInventory(storeId: number) {
  try {
    // Get store and access token
    const stores = await queryDb(
      `SELECT s.shop_domain, t.access_token, s.currency
       FROM shopify_stores s
       JOIN shopify_auth_tokens t ON s.id = t.store_id
       WHERE s.id = $1 AND s.status = 'active'
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [storeId],
    )

    if (stores.length === 0) {
      console.error(`No active store found with ID ${storeId}`)
      return []
    }

    const { shop_domain, access_token, currency: storeCurrency } = stores[0]

    console.log(`Fetching inventory for store: ${shop_domain}`)

    // First, fetch shop information to get the currency if not already stored
    let shopCurrency = storeCurrency || "USD" // Use stored currency or default to USD

    if (!storeCurrency) {
      try {
        const shopResponse = await fetch(`https://${shop_domain}/admin/api/2023-10/shop.json`, {
          headers: {
            "X-Shopify-Access-Token": access_token,
          },
          cache: "no-store",
        })

        if (shopResponse.ok) {
          const shopData = await shopResponse.json()
          shopCurrency = shopData.shop.currency || "USD"

          // Update the store currency in our database
          await queryDb(`UPDATE shopify_stores SET currency = $1 WHERE id = $2`, [shopCurrency, storeId])
        } else {
          console.error(`Failed to fetch shop info: ${shopResponse.statusText}`)
        }
      } catch (error) {
        console.error("Error fetching shop currency:", error)
      }
    }

    const client = await getShopifyAdminApiClient(shop_domain)

    if (!client) {
      console.error("Failed to create Shopify Admin API client")
      return []
    }

    // GraphQL query to fetch products with variants and inventory
    const query = `
      query GetProducts($numProducts: Int!) {
        products(first: $numProducts, query: "status:active") {
          edges {
            node {
              id
              title
              vendor
              productType
              status
              createdAt
              updatedAt
              images(first: 1) {
                edges {
                  node {
                    src
                  }
                }
              }
              variants(first: 250) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                    inventoryItem {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const variables = {
      numProducts: 50, // Adjust as needed
    }

    const data = await client.graphql(query, variables)

    if (!data?.products?.edges) {
      console.error("Invalid products data received:", data)
      return []
    }

    const productsWithInventory = data.products.edges.map((edge: any) => {
      const product = edge.node
      const variantsWithInventory = product.variants.edges.map((variantEdge: any) => {
        const variant = variantEdge.node
        return {
          ...variant,
          id: variant.id, // This is already in GID format from GraphQL
          inventory_quantity: variant.inventoryQuantity || 0,
          inventory_item_id: variant.inventoryItem?.id,
        }
      })

      return {
        ...product,
        id: product.id, // This is already in GID format from GraphQL
        product_type: product.productType || "Uncategorized", // Fix the field mapping
        variants: variantsWithInventory,
        currency: shopCurrency,
        images: product.images.edges.map((imageEdge: any) => imageEdge.node),
      }
    })

    return productsWithInventory
  } catch (error) {
    console.error("Error fetching Shopify inventory:", error)
    return []
  }
}

// Get connected store ID for current user
export async function getConnectedStoreId() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    const stores = await queryDb(
      `SELECT id FROM shopify_stores 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`,
      [user.id],
    )

    if (stores.length === 0) {
      console.error(`No active store found for user ${user.id}`)
      return null
    }

    return stores[0].id
  } catch (error) {
    console.error("Error getting connected store ID:", error)
    throw error
  }
}

// Get store currency
export async function getStoreCurrency() {
  try {
    const storeId = await getConnectedStoreId()

    if (!storeId) {
      return "USD" // Default currency
    }

    const result = await queryDb(`SELECT currency FROM shopify_stores WHERE id = $1`, [storeId])

    if (result.length === 0 || !result[0].currency) {
      return "USD" // Default currency
    }

    return result[0].currency
  } catch (error) {
    console.error("Error getting store currency:", error)
    return "USD" // Default currency on error
  }
}

// Get inventory summary data
export async function getInventorySummary() {
  try {
    const storeId = await getConnectedStoreId()

    if (!storeId) {
      return {
        totalProducts: 0,
        totalVariants: 0,
        totalInventory: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        currency: "USD",
      }
    }

    const products = await fetchShopifyInventory(storeId)

    // Get currency from the first product or default to USD
    const currency = products.length > 0 ? products[0].currency || "USD" : "USD"

    // Calculate summary statistics
    const totalProducts = products.length
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0)
    const totalInventory = products.reduce(
      (sum, product) =>
        sum + product.variants.reduce((variantSum, variant) => variantSum + (variant.inventory_quantity || 0), 0),
      0,
    )

    const lowStockItems = products.reduce(
      (sum, product) =>
        sum + product.variants.filter((v) => v.inventory_quantity > 0 && v.inventory_quantity < 5).length,
      0,
    )

    const outOfStockItems = products.reduce(
      (sum, product) => sum + product.variants.filter((v) => v.inventory_quantity === 0).length,
      0,
    )

    return {
      totalProducts,
      totalVariants,
      totalInventory,
      lowStockItems,
      outOfStockItems,
      currency,
    }
  } catch (error) {
    console.error("Error getting inventory summary:", error)
    return {
      totalProducts: 0,
      totalVariants: 0,
      totalInventory: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      currency: "USD",
    }
  }
}

// Get category breakdown data with bargaining enabled counts
export async function getCategoryBreakdown() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return []
    }

    const storeId = await getConnectedStoreId()
    if (!storeId) {
      return []
    }

    const products = await fetchShopifyInventory(storeId)

    // Get currency from the first product or default to USD
    const currency = products.length > 0 ? products[0].currency || "USD" : "USD"

    // Get product IDs to fetch bargaining settings
    const productIds = products.map((product) => product.id.toString())

    // Get bargaining settings for these products
    let bargainingSettings: Record<string, boolean> = {}

    if (productIds.length > 0) {
      try {
        // Convert product IDs to GID format for the query
        const productGids = productIds.map((id) => (id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`))
        const productIdsParam = `{${productGids.join(",")}}`

        const settings = await queryDb(
          `SELECT product_id, bargaining_enabled
           FROM product_bargaining_settings
           WHERE user_id = $1 AND product_id = ANY($2)`,
          [user.id, productIdsParam],
        )

        // Create a map of product ID to bargaining enabled status
        bargainingSettings = settings.reduce(
          (acc, setting) => {
            acc[setting.product_id] = setting.bargaining_enabled
            return acc
          },
          {} as Record<string, boolean>,
        )
      } catch (error) {
        console.error("Error fetching bargaining settings:", error)
      }
    }

    // Get categories with value and bargaining enabled counts
    const categoriesMap = products.reduce(
      (acc, product) => {
        const category = product.product_type || "Uncategorized" // Use product_type instead of productType
        const productValue = product.variants.reduce(
          (sum, variant) => sum + Number(variant.price || 0) * (variant.inventory_quantity || 0),
          0,
        )

        // Check if bargaining is enabled for this product using GID format
        const productGid = product.id.startsWith("gid://") ? product.id : `gid://shopify/Product/${product.id}`
        const isBargainingEnabled = bargainingSettings[productGid] || false

        if (!acc[category]) {
          acc[category] = { count: 0, value: 0, inventory: 0, bargainingEnabled: 0, currency }
        }

        acc[category].count += 1
        acc[category].value += productValue
        acc[category].inventory += product.variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0)

        // Increment bargaining enabled count if applicable
        if (isBargainingEnabled) {
          acc[category].bargainingEnabled += 1
        }

        return acc
      },
      {} as Record<
        string,
        { count: number; value: number; inventory: number; bargainingEnabled: number; currency: string }
      >,
    )

    return Object.entries(categoriesMap).map(([name, { count, value, inventory, bargainingEnabled, currency }]) => ({
      name,
      count,
      value,
      inventory,
      bargainingEnabled,
      currency,
    }))
  } catch (error) {
    console.error("Error getting category breakdown:", error)
    return []
  }
}

// Function to get the last sync information
export async function getLastSyncInfo() {
  try {
    const storeId = await getConnectedStoreId()

    if (!storeId) {
      return null
    }

    const syncHistory = await queryDb(
      `SELECT id, status, products_synced, variants_synced, 
              started_at, completed_at, error_message
       FROM product_sync_history
       WHERE shop_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [storeId],
    )

    if (syncHistory.length === 0) {
      return null
    }

    return {
      id: syncHistory[0].id,
      status: syncHistory[0].status,
      productsCount: syncHistory[0].products_synced,
      variantsCount: syncHistory[0].variants_synced,
      startedAt: syncHistory[0].started_at,
      completedAt: syncHistory[0].completed_at,
      errorMessage: syncHistory[0].error_message,
      duration: syncHistory[0].completed_at
        ? Math.round(
            (new Date(syncHistory[0].completed_at).getTime() - new Date(syncHistory[0].started_at).getTime()) / 1000,
          )
        : null,
    }
  } catch (error) {
    console.error("Error getting last sync info:", error)
    return null
  }
}

// Sync inventory data
export async function syncShopifyInventory() {
  let syncId = null

  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    const storeId = await getConnectedStoreId()

    if (!storeId) {
      return {
        success: false,
        message: "No active Shopify store connected",
      }
    }

    // Start the sync process - create a record with started_at timestamp
    const startResult = await queryDb(
      `INSERT INTO product_sync_history 
       (shop_id, status, started_at, products_synced, variants_synced) 
       VALUES ($1, $2, NOW(), 0, 0) 
       RETURNING id`,
      [storeId, "in_progress"],
    )

    syncId = startResult[0]?.id

    if (!syncId) {
      throw new Error("Failed to create sync history record")
    }

    // Fetch the latest inventory data
    const products = await fetchShopifyInventory(storeId)

    if (!products || products.length === 0) {
      // Update the sync record with error status
      await queryDb(
        `UPDATE product_sync_history 
         SET status = $1, 
             error_message = $2, 
             completed_at = NOW() 
         WHERE id = $3`,
        ["error", "No products found", syncId],
      )

      return {
        success: false,
        message: "Failed to fetch inventory data or no products found",
      }
    }

    // Calculate total variants
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0)

    // Update the sync record with success status and product counts
    await queryDb(
      `UPDATE product_sync_history 
       SET status = $1, 
           products_synced = $2, 
           variants_synced = $3, 
           completed_at = NOW() 
       WHERE id = $4`,
      ["success", products.length, totalVariants, syncId],
    )

    // Revalidate the inventory page
    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Inventory synced successfully",
      timestamp: new Date().toISOString(),
      productCount: products.length,
      variantCount: totalVariants,
    }
  } catch (error) {
    console.error("Error syncing inventory:", error)

    // Update the sync record with error status if we have a syncId
    if (syncId) {
      try {
        await queryDb(
          `UPDATE product_sync_history 
           SET status = $1, 
               error_message = $2, 
               completed_at = NOW() 
           WHERE id = $3`,
          ["error", error instanceof Error ? error.message : "Unknown error", syncId],
        )
      } catch (logError) {
        console.error("Error updating sync failure record:", logError)
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync inventory",
    }
  }
}

// Sync products data (alias for syncShopifyInventory for backward compatibility)
export async function syncShopifyProducts() {
  // This function serves as an alias for syncShopifyInventory for backward compatibility
  return syncShopifyInventory()
}

// Export the function to get product bargaining settings
export async function getProductBargainingSettings(productIds: string[]) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return []
    }

    if (!productIds || productIds.length === 0) {
      return []
    }

    // Convert array to PostgreSQL array format
    const productIdsParam = `{${productIds.join(",")}}`

    const settings = await queryDb(
      `SELECT product_id, variant_id, bargaining_enabled, min_price, behavior
       FROM product_bargaining_settings
       WHERE user_id = $1 AND product_id = ANY($2)`,
      [user.id, productIdsParam],
    )

    return settings.map((setting) => ({
      productId: setting.product_id,
      variantId: setting.variant_id,
      enabled: setting.bargaining_enabled,
      minPrice: Number.parseFloat(setting.min_price),
      behavior: setting.behavior,
    }))
  } catch (error) {
    console.error("Error getting product bargaining settings:", error)
    return []
  }
}
