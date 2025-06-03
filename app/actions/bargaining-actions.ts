"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Get user's bargaining limits based on their membership
export async function getUserBargainingLimits() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get the user's active membership and plan details
    const membershipQuery = `
     SELECT 
       um.id as membership_id,
       um.user_id,
       um.plan_id,
       mp.name as plan_name,
       mp.slug as plan_slug,
       mp.product_limit as max_products,
       mp.price
     FROM user_memberships um
     JOIN membership_plans mp ON um.plan_id = mp.id
     WHERE um.user_id = $1 AND um.status = 'active'
     LIMIT 1
   `

    const memberships = await queryDb(membershipQuery, [user.id])

    if (memberships.length === 0) {
      // If no active membership found, get the free plan as fallback
      const freePlanQuery = `
       SELECT id, name, slug, product_limit as max_products
       FROM membership_plans
       WHERE slug = 'free'
       LIMIT 1
     `

      const freePlans = await queryDb(freePlanQuery)

      if (freePlans.length === 0) {
        throw new Error("No membership plan found")
      }

      // Count currently enabled products
      const enabledProductsQuery = `
       SELECT COUNT(DISTINCT product_id) as count
       FROM product_bargaining_settings
       WHERE user_id = $1 AND bargaining_enabled = true
     `

      const enabledProducts = await queryDb(enabledProductsQuery, [user.id])

      return {
        maxProducts: freePlans[0].max_products,
        currentlyEnabled: Number.parseInt(enabledProducts[0]?.count || "0"),
        membershipLevel: freePlans[0].slug,
        planName: freePlans[0].name,
      }
    }

    // Count currently enabled products
    const enabledProductsQuery = `
     SELECT COUNT(DISTINCT product_id) as count
     FROM product_bargaining_settings
     WHERE user_id = $1 AND bargaining_enabled = true
   `

    const enabledProducts = await queryDb(enabledProductsQuery, [user.id])

    return {
      maxProducts: memberships[0].max_products,
      currentlyEnabled: Number.parseInt(enabledProducts[0]?.count || "0"),
      membershipLevel: memberships[0].plan_slug,
      planName: memberships[0].plan_name,
    }
  } catch (error) {
    console.error("Error getting user bargaining limits:", error)
    // Return default values
    return {
      maxProducts: 10, // Default free plan limit
      currentlyEnabled: 0,
      membershipLevel: "free",
      planName: "Free",
    }
  }
}

// Get existing bargaining settings for products
export async function getProductBargainingSettings(productIds: string[]) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    if (productIds.length === 0) {
      return []
    }

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    // Get settings for the specified products
    const settings = await queryDb(
      `SELECT product_id, variant_id, bargaining_enabled, min_price, original_price, behavior 
      FROM product_bargaining_settings 
      WHERE user_id = $1 AND product_id = ANY($2)`,
      [user.id, productIds],
    )

    return settings
  } catch (error) {
    console.error("Error getting product bargaining settings:", error)
    return []
  }
}

// Enable bargaining for a product
export async function enableProductBargaining(
  productId: string,
  minPrice: number,
  originalPrice: number,
  behavior = "normal",
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get user's bargaining limits
    const limits = await getUserBargainingLimits()

    // Check if user has reached their limit
    if (limits.maxProducts > 0 && limits.currentlyEnabled >= limits.maxProducts) {
      return {
        success: false,
        message: "You've reached your bargaining product limit. Please upgrade your plan to enable more products.",
      }
    }

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    // Enable bargaining for the product
    try {
      // Try with original_price column
      await queryDb(
        `
       INSERT INTO product_bargaining_settings 
         (user_id, product_id, variant_id, bargaining_enabled, min_price, original_price, behavior, updated_at)
       VALUES 
         ($1, $2, $3, true, $4, $5, $6, NOW())
       ON CONFLICT (user_id, product_id, variant_id) 
       DO UPDATE SET 
         bargaining_enabled = true,
         min_price = $4,
         original_price = $5,
         behavior = $6,
         updated_at = NOW()
       `,
        [user.id, productId, productId, minPrice, originalPrice, behavior],
      )
    } catch (error) {
      console.error("Error with original_price column, trying without it:", error)

      // Fallback: Try without original_price column
      await queryDb(
        `
       INSERT INTO product_bargaining_settings 
         (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at)
       VALUES 
         ($1, $2, $3, true, $4, $5, NOW())
       ON CONFLICT (user_id, product_id, variant_id) 
       DO UPDATE SET 
         bargaining_enabled = true,
         min_price = $4,
         behavior = $5,
         updated_at = NOW()
       `,
        [user.id, productId, productId, minPrice, behavior],
      )
    }

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Bargaining enabled for this product",
    }
  } catch (error) {
    console.error("Error enabling product bargaining:", error)
    return {
      success: false,
      message: "Failed to enable bargaining for this product",
    }
  }
}

// Disable bargaining for a product
export async function disableProductBargaining(productId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    await queryDb(
      `
     UPDATE product_bargaining_settings
     SET bargaining_enabled = false, updated_at = NOW()
     WHERE user_id = $1 AND product_id = $2
     `,
      [user.id, productId],
    )

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Bargaining disabled for this product",
    }
  } catch (error) {
    console.error("Error disabling product bargaining:", error)
    return {
      success: false,
      message: "Failed to disable bargaining for this product",
    }
  }
}

// Update global bargaining settings
export async function updateBulkBargainingSettings(settings: any) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get user's bargaining limits
    const limits = await getUserBargainingLimits()

    // If enabling all products, check if user has enough product slots
    if (settings.enableAll) {
      // Get total product count
      const productCountQuery = `
       SELECT COUNT(*) as count
       FROM shopify_products
       WHERE user_id = $1
     `

      const productCount = await queryDb(productCountQuery, [user.id])
      const totalProducts = Number.parseInt(productCount[0]?.count || "0")

      if (limits.maxProducts > 0 && totalProducts > limits.maxProducts) {
        return {
          success: false,
          message: `Your current plan allows only ${limits.maxProducts} products for bargaining, but you have ${totalProducts} products. Please upgrade your plan.`,
        }
      }
    }

    // Update global settings
    await queryDb(
      `
     INSERT INTO global_bargaining_settings 
       (user_id, enable_all, min_price_type, min_price_value, bargaining_behavior, updated_at)
     VALUES 
       ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       enable_all = $2,
       min_price_type = $3,
       min_price_value = $4,
       bargaining_behavior = $5,
       updated_at = NOW()
     `,
      [user.id, settings.enableAll, settings.minPriceType, settings.minPriceValue, settings.behavior],
    )

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    // If enabling all products, update all product settings
    if (settings.enableAll) {
      try {
        // Try with original_price column
        await queryDb(
          `
         INSERT INTO product_bargaining_settings 
           (user_id, product_id, variant_id, bargaining_enabled, min_price, original_price, behavior, updated_at)
         SELECT 
           $1, id, id, -- Use product ID as variant ID to avoid "default"
           CASE WHEN inventory_quantity > 0 THEN true ELSE false END, -- Only enable for in-stock products
           CASE 
             WHEN $2 = 'percentage' THEN LEAST(price * ($3/100), price) -- Ensure min_price <= price
             ELSE LEAST($3, price) -- Ensure min_price <= price
           END,
           price, -- Store original price
           $4, NOW()
         FROM shopify_products
         WHERE user_id = $1 AND inventory_quantity > 0 -- Only for in-stock products
         ON CONFLICT (user_id, product_id, variant_id) 
         DO UPDATE SET 
           bargaining_enabled = 
             CASE WHEN (SELECT inventory_quantity FROM shopify_products WHERE id = product_bargaining_settings.product_id) > 0 
                  THEN true ELSE false END,
           min_price = 
             CASE 
               WHEN $2 = 'percentage' THEN 
                 LEAST((SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id) * ($3/100),
                       (SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id))
               ELSE LEAST($3, (SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id))
             END,
           original_price = (SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id),
           behavior = $4,
           updated_at = NOW()
         `,
          [user.id, settings.minPriceType, settings.minPriceValue, settings.behavior],
        )
      } catch (error) {
        console.error("Error with original_price column, trying without it:", error)

        // Fallback: Try without original_price column
        await queryDb(
          `
         INSERT INTO product_bargaining_settings 
           (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at)
         SELECT 
           $1, id, id, -- Use product ID as variant ID to avoid "default"
           CASE WHEN inventory_quantity > 0 THEN true ELSE false END, -- Only enable for in-stock products
           CASE 
             WHEN $2 = 'percentage' THEN LEAST(price * ($3/100), price) -- Ensure min_price <= price
             ELSE LEAST($3, price) -- Ensure min_price <= price
           END,
           $4, NOW()
         FROM shopify_products
         WHERE user_id = $1 AND inventory_quantity > 0 -- Only for in-stock products
         ON CONFLICT (user_id, product_id, variant_id) 
         DO UPDATE SET 
           bargaining_enabled = 
             CASE WHEN (SELECT inventory_quantity FROM shopify_products WHERE id = product_bargaining_settings.product_id) > 0 
                  THEN true ELSE false END,
           min_price = 
             CASE 
               WHEN $2 = 'percentage' THEN 
                 LEAST((SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id) * ($3/100),
                       (SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id))
               ELSE LEAST($3, (SELECT price FROM shopify_products WHERE id = product_bargaining_settings.product_id))
             END,
           behavior = $4,
           updated_at = NOW()
         `,
          [user.id, settings.minPriceType, settings.minPriceValue, settings.behavior],
        )
      }
    }

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: settings.enableAll
        ? "Bargaining enabled for all in-stock products"
        : "Global bargaining settings updated",
    }
  } catch (error) {
    console.error("Error updating global bargaining settings:", error)
    return {
      success: false,
      message: "Failed to update global bargaining settings",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function saveBargainingSettingsForProduct(
  productId: string,
  variantIds: string[],
  enabled: boolean,
  minPriceType: string,
  minPriceValue: number,
  originalPrices: Record<string, number>,
  behavior: string,
  inventoryQuantities: Record<string, number> = {},
) {
  try {
    console.log("Saving bargaining settings for product:", {
      productId,
      variantIds,
      enabled,
      minPriceType,
      minPriceValue,
      originalPrices,
      behavior,
      inventoryQuantities,
    })

    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    const userId = user.id

    // Check if the user has reached their limit
    if (enabled) {
      const limits = await getUserBargainingLimits()

      // Only check limits if this is a new product being enabled
      const existingEnabledSettings = await queryDb(
        `SELECT COUNT(*) as count FROM product_bargaining_settings 
        WHERE user_id = $1 AND product_id = $2 AND bargaining_enabled = true`,
        [userId, productId],
      )

      const currentlyEnabledForThisProduct = Number.parseInt(existingEnabledSettings[0]?.count || "0")

      if (
        limits.maxProducts > 0 &&
        currentlyEnabledForThisProduct === 0 &&
        limits.currentlyEnabled >= limits.maxProducts
      ) {
        return {
          success: false,
          message: "You've reached your bargaining product limit. Please upgrade your plan to enable more products.",
        }
      }
    }

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    // Process each variant
    for (const variantId of variantIds) {
      // Get original price and inventory quantity
      const originalPrice = originalPrices[variantId] || 0
      const inventoryQuantity = inventoryQuantities[variantId] || 0

      // Skip if inventory is 0 and trying to enable bargaining
      if (enabled && inventoryQuantity <= 0) {
        console.log(`Skipping variant ${variantId} because inventory is 0`)
        continue
      }

      // Calculate min price based on type
      let minPrice = 0
      if (minPriceType === "percentage") {
        minPrice = originalPrice * (minPriceValue / 100)
      } else {
        minPrice = minPriceValue
      }

      // Ensure min price is not higher than original price
      minPrice = Math.min(minPrice, originalPrice)

      console.log(`Processing variant ${variantId} with min price ${minPrice} and original price ${originalPrice}`)

      try {
        // Try with original_price column
        await queryDb(
          `INSERT INTO product_bargaining_settings 
          (user_id, product_id, variant_id, bargaining_enabled, min_price, original_price, behavior, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (user_id, product_id, variant_id) 
          DO UPDATE SET 
            bargaining_enabled = $4, 
            min_price = $5, 
            original_price = $6, 
            behavior = $7, 
            updated_at = NOW()`,
          [userId, productId, variantId, enabled, minPrice, originalPrice, behavior],
        )
      } catch (error) {
        console.error(`Error with original_price column for variant ${variantId}, trying without it:`, error)

        // Fallback: Try without original_price column
        await queryDb(
          `INSERT INTO product_bargaining_settings 
          (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (user_id, product_id, variant_id) 
          DO UPDATE SET 
            bargaining_enabled = $4, 
            min_price = $5, 
            behavior = $6, 
            updated_at = NOW()`,
          [userId, productId, variantId, enabled, minPrice, behavior],
        )
      }

      // Verify the settings were saved correctly
      const verifyQuery = `
       SELECT bargaining_enabled, min_price, behavior
       FROM product_bargaining_settings
       WHERE user_id = $1 AND product_id = $2 AND variant_id = $3
     `
      const verifyResult = await queryDb(verifyQuery, [userId, productId, variantId])
      console.log(`Verification for variant ${variantId}:`, verifyResult[0])

      console.log(`Updated settings for variant ${variantId}`)
    }

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Bargaining settings saved successfully",
    }
  } catch (error) {
    console.error("Error saving bargaining settings:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save bargaining settings",
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}

export async function saveBargainingSettings(
  productId: string,
  variantId: string,
  enabled: boolean,
  minPrice: number,
  originalPrice: number,
  behavior: string,
  inventoryQuantity = 0,
) {
  try {
    console.log("Saving bargaining settings:", {
      productId,
      variantId,
      enabled,
      minPrice,
      originalPrice,
      behavior,
      inventoryQuantity,
    })

    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Validate inputs
    if (!productId || !variantId) {
      throw new Error("Product ID and Variant ID are required")
    }

    if (originalPrice <= 0) {
      throw new Error("Original price must be greater than 0")
    }

    // Check if inventory is 0 and trying to enable bargaining
    if (enabled && inventoryQuantity <= 0) {
      return {
        success: false,
        message: "Cannot enable bargaining for out-of-stock items",
      }
    }

    // Ensure min price is not higher than original price
    if (minPrice > originalPrice) {
      minPrice = originalPrice
    }

    const userId = user.id

    // Check if the user has reached their limit
    if (enabled) {
      const limits = await getUserBargainingLimits()

      // Only check limits if this is a new product being enabled
      const existingEnabledSettings = await queryDb(
        `SELECT COUNT(*) as count FROM product_bargaining_settings 
        WHERE user_id = $1 AND product_id = $2 AND bargaining_enabled = true`,
        [userId, productId],
      )

      const currentlyEnabledForThisProduct = Number.parseInt(existingEnabledSettings[0]?.count || "0")

      if (
        limits.maxProducts > 0 &&
        currentlyEnabledForThisProduct === 0 &&
        limits.currentlyEnabled >= limits.maxProducts
      ) {
        return {
          success: false,
          message: "You've reached your bargaining product limit. Please upgrade your plan to enable more products.",
        }
      }
    }

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    try {
      // Try with original_price column
      await queryDb(
        `INSERT INTO product_bargaining_settings 
        (user_id, product_id, variant_id, bargaining_enabled, min_price, original_price, behavior, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id, product_id, variant_id) 
        DO UPDATE SET 
          bargaining_enabled = $4, 
          min_price = $5, 
          original_price = $6, 
          behavior = $7, 
          updated_at = NOW()`,
        [userId, productId, variantId, enabled, minPrice, originalPrice, behavior],
      )
    } catch (error) {
      console.error("Error with original_price column, trying without it:", error)

      // Fallback: Try without original_price column
      await queryDb(
        `INSERT INTO product_bargaining_settings 
        (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id, product_id, variant_id) 
        DO UPDATE SET 
          bargaining_enabled = $4, 
          min_price = $5, 
          behavior = $6, 
          updated_at = NOW()`,
        [userId, productId, variantId, enabled, minPrice, behavior],
      )
    }

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Bargaining settings saved successfully",
    }
  } catch (error) {
    console.error("Error saving bargaining settings:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save bargaining settings",
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}

export async function bulkUpdateBargainingSettings(productSettings: any[]) {
  try {
    console.log("Bulk updating bargaining settings:", productSettings)

    const user = await getCurrentUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    const userId = user.id

    // Check if the user has reached their limit when enabling
    if (productSettings.length > 0 && productSettings[0].enabled) {
      const limits = await getUserBargainingLimits()

      // Count how many new products would be enabled
      const productIds = productSettings.map((setting) => setting.productId)

      const existingEnabledQuery = `
       SELECT COUNT(DISTINCT product_id) as count 
       FROM product_bargaining_settings 
       WHERE user_id = $1 AND product_id = ANY($2) AND bargaining_enabled = true
     `

      const existingEnabled = await queryDb(existingEnabledQuery, [userId, productIds])
      const existingEnabledCount = Number.parseInt(existingEnabled[0]?.count || "0")

      const newProductsCount = productIds.length - existingEnabledCount

      if (limits.maxProducts > 0 && limits.currentlyEnabled + newProductsCount > limits.maxProducts) {
        return {
          success: false,
          message: `Your plan allows only ${limits.maxProducts} products for bargaining. You currently have ${limits.currentlyEnabled} enabled and are trying to add ${newProductsCount} more.`,
        }
      }
    }

    // First, check if the original_price column exists
    try {
      const columnCheck = await queryDb(`
       SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'product_bargaining_settings' 
       AND column_name = 'original_price'
     `)

      const hasOriginalPriceColumn = columnCheck.length > 0

      // If column doesn't exist, add it
      if (!hasOriginalPriceColumn) {
        await queryDb(`
         ALTER TABLE product_bargaining_settings 
         ADD COLUMN original_price DECIMAL(10, 2)
       `)
        console.log("Added missing original_price column to product_bargaining_settings table")
      }
    } catch (error) {
      console.error("Error checking/adding original_price column:", error)
      // Continue anyway, as the main operation might still work
    }

    // Process each product's settings
    for (const productSetting of productSettings) {
      const {
        productId,
        variantIds,
        enabled,
        minPriceType,
        minPriceValue,
        originalPrices,
        behavior,
        inventoryQuantities = {},
      } = productSetting

      // Process each variant
      for (const variantId of variantIds) {
        const originalPrice = originalPrices[variantId] || 0
        const inventoryQuantity = inventoryQuantities[variantId] || 0

        // Skip if inventory is 0 and trying to enable bargaining
        if (enabled && inventoryQuantity <= 0) {
          console.log(`Skipping variant ${variantId} because inventory is 0`)
          continue
        }

        // Calculate min price based on type
        let minPrice = 0
        if (minPriceType === "percentage") {
          minPrice = originalPrice * (minPriceValue / 100)
        } else {
          minPrice = minPriceValue
        }

        // Ensure min price is not higher than original price
        minPrice = Math.min(minPrice, originalPrice)

        try {
          // Try with original_price column
          await queryDb(
            `INSERT INTO product_bargaining_settings 
            (user_id, product_id, variant_id, bargaining_enabled, min_price, original_price, behavior, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (user_id, product_id, variant_id) 
            DO UPDATE SET 
              bargaining_enabled = $4, 
              min_price = $5, 
              original_price = $6, 
              behavior = $7, 
              updated_at = NOW()`,
            [userId, productId, variantId, enabled, minPrice, originalPrice, behavior],
          )
        } catch (error) {
          console.error(`Error with original_price column for variant ${variantId}, trying without it:`, error)

          // Fallback: Try without original_price column
          await queryDb(
            `INSERT INTO product_bargaining_settings 
            (user_id, product_id, variant_id, bargaining_enabled, min_price, behavior, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id, product_id, variant_id) 
            DO UPDATE SET 
              bargaining_enabled = $4, 
              min_price = $5, 
              behavior = $6, 
              updated_at = NOW()`,
            [userId, productId, variantId, enabled, minPrice, behavior],
          )
        }
      }
    }

    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      message: "Bargaining settings updated successfully",
    }
  } catch (error) {
    console.error("Error saving bargaining settings:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save bargaining settings",
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}
