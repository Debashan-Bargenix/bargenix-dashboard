"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

export interface BargainRequest {
  id: number
  shop_domain: string
  product_id: string
  variant_id: string | null
  product_title: string | null
  product_price: number | null
  customer_email: string | null
  status: string
  notes: string | null
  created_at?: string
  updated_at?: string
  request_date?: string
  user_id?: number
}

export interface ShopifyProductDetails {
  id: string
  title: string
  price: string
  compare_at_price: string | null
  inventory_quantity: number
  sku: string | null
  image_url: string | null
}

// Get all bargain requests for the current user's connected stores
export async function getBargainRequests(): Promise<BargainRequest[]> {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      console.error("User not authenticated")
      return []
    }

    // Get the user's connected Shopify stores
    const stores = await sql`
      SELECT shop_domain 
      FROM shopify_stores 
      WHERE user_id = ${user.id}
    `

    if (stores.length === 0) {
      console.log("No connected Shopify stores found")
      return []
    }

    // Extract shop domains
    const shopDomains = stores.map((store) => store.shop_domain)

    // Fetch requests for the user's stores
    const requests = await sql`
      SELECT * FROM bargain_requests
      WHERE shop_domain = ANY(${shopDomains})
      ORDER BY 
        COALESCE(created_at, request_date) DESC
    `

    console.log(`Found ${requests.length} bargain requests`)
    return requests.map((req) => ({
      ...req,
      created_at: req.created_at || req.request_date,
      updated_at: req.updated_at || req.request_date,
    })) as BargainRequest[]
  } catch (error) {
    console.error("Error fetching bargain requests:", error)
    return []
  }
}

// Get a single bargain request by ID
export async function getBargainRequestById(id: number): Promise<BargainRequest | null> {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      console.error("User not authenticated")
      return null
    }

    // Get the user's connected Shopify stores
    const stores = await sql`
      SELECT shop_domain 
      FROM shopify_stores 
      WHERE user_id = ${user.id}
    `

    if (stores.length === 0) {
      console.log("No connected Shopify stores found")
      return null
    }

    // Extract shop domains
    const shopDomains = stores.map((store) => store.shop_domain)

    // Fetch the request and ensure it belongs to one of the user's stores
    const [request] = await sql`
      SELECT * FROM bargain_requests
      WHERE id = ${id}
      AND shop_domain = ANY(${shopDomains})
    `

    if (!request) return null

    return {
      ...request,
      created_at: request.created_at || request.request_date,
      updated_at: request.updated_at || request.request_date,
    } as BargainRequest
  } catch (error) {
    console.error(`Error fetching bargain request with ID ${id}:`, error)
    return null
  }
}

// Update bargain request status
export async function updateBargainRequestStatus(
  requestId: number,
  status: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the user's connected Shopify stores
    const stores = await sql`
      SELECT shop_domain 
      FROM shopify_stores 
      WHERE user_id = ${user.id}
    `

    if (stores.length === 0) {
      return { success: false, error: "No connected Shopify stores found" }
    }

    // Extract shop domains
    const shopDomains = stores.map((store) => store.shop_domain)

    // Check if the updated_at column exists
    const hasUpdatedAt = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'bargain_requests'
        AND column_name = 'updated_at'
      );
    `

    // Update the request status and ensure it belongs to one of the user's stores
    if (hasUpdatedAt[0].exists) {
      await sql`
        UPDATE bargain_requests
        SET status = ${status}, 
            notes = COALESCE(${notes}, notes),
            updated_at = NOW()
        WHERE id = ${requestId}
        AND shop_domain = ANY(${shopDomains})
      `
    } else {
      await sql`
        UPDATE bargain_requests
        SET status = ${status}, 
            notes = COALESCE(${notes}, notes)
        WHERE id = ${requestId}
        AND shop_domain = ANY(${shopDomains})
      `
    }

    revalidatePath("/dashboard/request-bargain")
    return { success: true }
  } catch (error) {
    console.error(`Error updating bargain request status for ID ${requestId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update request status",
    }
  }
}

// Get Shopify product details
export async function getShopifyProductDetails(
  shopDomain: string,
  productId: string,
  variantId: string | null,
): Promise<ShopifyProductDetails | null> {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      console.error("User not authenticated")
      return null
    }

    // Verify the shop belongs to the user
    const [store] = await sql`
      SELECT id 
      FROM shopify_stores 
      WHERE user_id = ${user.id} 
      AND shop_domain = ${shopDomain}
    `

    if (!store) {
      console.error("Shop not found or not authorized")
      return null
    }

    // First try to get from shopify_products table
    const [product] = await sql`
      SELECT 
        product_id,
        title, 
        price, 
        compare_at_price,
        inventory_quantity,
        sku,
        image_url
      FROM shopify_products
      WHERE shop_domain = ${shopDomain}
      AND product_id = ${productId}
      LIMIT 1
    `

    if (product) {
      return {
        id: product.product_id,
        title: product.title,
        price: product.price,
        compare_at_price: product.compare_at_price,
        inventory_quantity: product.inventory_quantity || 0,
        sku: product.sku,
        image_url: product.image_url,
      }
    }

    // If not found, return a placeholder
    return {
      id: productId,
      title: "Product details not available",
      price: "0.00",
      compare_at_price: null,
      inventory_quantity: 0,
      sku: null,
      image_url: null,
    }
  } catch (error) {
    console.error(`Error fetching product details for ${productId}:`, error)
    return null
  }
}

// Check if bargaining is enabled for a product
export async function checkBargainingStatus(productId: string, variantId: string | null) {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      console.error("User not authenticated")
      return { enabled: false, minPrice: null, behavior: "normal" }
    }

    // Check if the product_bargaining_settings table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_bargaining_settings'
      );
    `

    if (!tableExists[0].exists) {
      console.log("product_bargaining_settings table does not exist")
      return { enabled: false, minPrice: null, behavior: "normal" }
    }

    // Check if the table has the expected columns
    const columnsExist = await sql`
      SELECT 
        COUNT(*) as column_count
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'product_bargaining_settings'
        AND column_name IN ('product_id', 'variant_id', 'enabled', 'min_price', 'behavior')
    `

    if (columnsExist[0].column_count < 5) {
      console.log("product_bargaining_settings table is missing expected columns")
      return { enabled: false, minPrice: null, behavior: "normal" }
    }

    // Query for settings
    let settings
    if (variantId) {
      ;[settings] = await sql`
        SELECT 
          enabled, 
          min_price, 
          behavior
        FROM product_bargaining_settings
        WHERE product_id = ${productId}
        AND variant_id = ${variantId}
      `
    } else {
      ;[settings] = await sql`
        SELECT 
          enabled, 
          min_price, 
          behavior
        FROM product_bargaining_settings
        WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = '')
      `
    }

    if (settings) {
      return {
        enabled: settings.enabled,
        minPrice: settings.min_price,
        behavior: settings.behavior,
      }
    }

    return {
      enabled: false,
      minPrice: null,
      behavior: "normal",
    }
  } catch (error) {
    console.error(`Error checking bargaining status for product ${productId}:`, error)
    return {
      enabled: false,
      minPrice: null,
      behavior: "normal",
    }
  }
}

// Approve a bargain request and enable bargaining
export async function approveBargainRequest(
  requestId: number,
  minPrice: number,
  originalPrice: number,
  behavior = "normal",
  notes?: string,
) {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the request details
    const request = await getBargainRequestById(requestId)
    if (!request) {
      return { success: false, error: "Bargain request not found or not authorized" }
    }

    // Update the request status
    await updateBargainRequestStatus(requestId, "approved", notes)

    // Check if the product_bargaining_settings table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_bargaining_settings'
      );
    `

    if (!tableExists[0].exists) {
      return { success: false, error: "product_bargaining_settings table does not exist" }
    }

    // Enable bargaining for the product
    await enableProductBargaining(request.product_id, minPrice, originalPrice, behavior)

    revalidatePath("/dashboard/request-bargain")
    return { success: true }
  } catch (error) {
    console.error(`Error approving bargain request ${requestId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve request",
    }
  }
}

// Enable bargaining for a product
async function enableProductBargaining(productId: string, minPrice: number, originalPrice: number, behavior: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  // Check if bargaining settings already exist
  const [existingSettings] = await sql`
    SELECT id FROM product_bargaining_settings
    WHERE product_id = ${productId}
  `

  // Check if the original_price column exists
  const originalPriceColumnExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'product_bargaining_settings'
      AND column_name = 'original_price'
    );
  `

  if (existingSettings) {
    // Update existing settings
    if (originalPriceColumnExists[0].exists) {
      await sql`
        UPDATE product_bargaining_settings
        SET 
          enabled = true,
          min_price = ${minPrice},
          original_price = ${originalPrice},
          behavior = ${behavior},
          updated_at = NOW()
        WHERE id = ${existingSettings.id}
      `
    } else {
      await sql`
        UPDATE product_bargaining_settings
        SET 
          enabled = true,
          min_price = ${minPrice},
          behavior = ${behavior},
          updated_at = NOW()
        WHERE id = ${existingSettings.id}
      `
    }
  } else {
    // Create new settings
    if (originalPriceColumnExists[0].exists) {
      await sql`
        INSERT INTO product_bargaining_settings (
          user_id,
          product_id,
          enabled,
          min_price,
          original_price,
          behavior,
          created_at,
          updated_at
        ) VALUES (
          ${user.id},
          ${productId},
          true,
          ${minPrice},
          ${originalPrice},
          ${behavior},
          NOW(),
          NOW()
        )
      `
    } else {
      await sql`
        INSERT INTO product_bargaining_settings (
          user_id,
          product_id,
          enabled,
          min_price,
          behavior,
          created_at,
          updated_at
        ) VALUES (
          ${user.id},
          ${productId},
          true,
          ${minPrice},
          ${behavior},
          NOW(),
          NOW()
        )
      `
    }
  }
}

// Create a test bargain request (for development/testing)
export async function createTestBargainRequest() {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the user's connected Shopify store
    const [store] = await sql`
      SELECT shop_domain 
      FROM shopify_stores 
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (!store) {
      return { success: false, error: "No connected Shopify store found" }
    }

    // Check if the updated_at and created_at columns exist
    const columnsExist = await sql`
      SELECT 
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'created_at') as has_created_at,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'updated_at') as has_updated_at,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bargain_requests' AND column_name = 'status') as has_status
    `

    // Create a test request
    let result
    if (columnsExist[0].has_created_at && columnsExist[0].has_updated_at && columnsExist[0].has_status) {
      result = await sql`
        INSERT INTO bargain_requests (
          shop_domain,
          product_id,
          variant_id,
          customer_email,
          product_title,
          product_price,
          status,
          notes,
          created_at,
          updated_at,
          user_id
        ) VALUES (
          ${store.shop_domain},
          ${"gid://shopify/Product/123456789"},
          ${"gid://shopify/ProductVariant/987654321"},
          ${"test@example.com"},
          ${"Test Product"},
          ${99.99},
          ${"pending"},
          ${"This is a test bargain request created for development purposes."},
          NOW(),
          NOW(),
          ${user.id}
        ) RETURNING id
      `
    } else {
      // Fallback for older schema
      result = await sql`
        INSERT INTO bargain_requests (
          shop_domain,
          product_id,
          variant_id,
          customer_email,
          product_title,
          product_price,
          request_date
        ) VALUES (
          ${store.shop_domain},
          ${"gid://shopify/Product/123456789"},
          ${"gid://shopify/ProductVariant/987654321"},
          ${"test@example.com"},
          ${"Test Product"},
          ${99.99},
          NOW()
        ) RETURNING id
      `
    }

    revalidatePath("/dashboard/request-bargain")

    return {
      success: true,
      message: "Test bargain request created successfully",
      id: result[0].id,
    }
  } catch (error) {
    console.error("Error creating test bargain request:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create test request",
    }
  }
}
