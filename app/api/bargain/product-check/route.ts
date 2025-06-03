import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"

const sql = neon(DATABASE_URL)

// Helper function to ensure an ID is in GID format
function ensureGID(id: string, type: "Product" | "ProductVariant"): string {
  if (!id) return "" // Handle null or undefined IDs
  if (id.startsWith("gid://shopify/")) {
    return id
  }
  return `gid://shopify/${type}/${id}`
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200, // Use 200 for OPTIONS preflight
    headers: {
      "Access-Control-Allow-Origin": "*", // Or specify your Shopify domain for better security
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      "Access-Control-Max-Age": "86400", // Cache preflight response for 1 day
    },
  })
}

export async function GET(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")
    const productIdParam = searchParams.get("productId")
    const variantIdParam = searchParams.get("variantId") || "default"

    if (!shop || !productIdParam) {
      console.error("product-check: Missing required parameters", { shop, productIdParam })
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400, headers })
    }

    // Always convert incoming product and variant IDs to GID format for querying
    const productIdGID = ensureGID(productIdParam, "Product")
    const variantIdGID = ensureGID(variantIdParam, "ProductVariant")

    console.log(
      `product-check: Checking eligibility for shop: ${shop}, productGID: ${productIdGID}, variantGID: ${variantIdGID}`,
    )

    let settingsResult
    try {
      // Query 1: Try to find settings by exact GID variant ID match
      settingsResult = await sql`
        SELECT 
          pbs.bargaining_enabled, pbs.min_price, pbs.behavior, pbs.original_price,
          pbs.product_id AS settings_product_id, pbs.variant_id AS settings_variant_id
        FROM product_bargaining_settings pbs
        WHERE pbs.variant_id = ${variantIdGID} AND pbs.bargaining_enabled = true
        LIMIT 1
      `
      console.log("product-check: Query 1 (Variant GID) result:", settingsResult)

      // Query 2: If no variant-specific, try by product GID (for product-level settings)
      if (!settingsResult || settingsResult.length === 0) {
        settingsResult = await sql`
          SELECT 
            pbs.bargaining_enabled, pbs.min_price, pbs.behavior, pbs.original_price,
            pbs.product_id AS settings_product_id, pbs.variant_id AS settings_variant_id
          FROM product_bargaining_settings pbs
          WHERE pbs.product_id = ${productIdGID} AND pbs.bargaining_enabled = true
          -- Ensure it's a product-level setting (variant_id might be 'default' or null)
          AND (pbs.variant_id IS NULL OR pbs.variant_id = 'default' OR pbs.variant_id = '') 
          LIMIT 1
        `
        console.log("product-check: Query 2 (Product GID) result:", settingsResult)
      }

      // Query 3: Fallback - check if any setting exists for the user and product GID, regardless of variant
      if (!settingsResult || settingsResult.length === 0) {
        const shopData = await sql`SELECT user_id FROM shopify_stores WHERE shop_domain = ${shop} LIMIT 1`
        if (shopData && shopData.length > 0) {
          const userId = shopData[0].user_id
          settingsResult = await sql`
            SELECT 
              pbs.bargaining_enabled, pbs.min_price, pbs.behavior, pbs.original_price,
              pbs.product_id AS settings_product_id, pbs.variant_id AS settings_variant_id
            FROM product_bargaining_settings pbs
            WHERE pbs.user_id = ${userId} AND pbs.product_id = ${productIdGID} AND pbs.bargaining_enabled = true
            LIMIT 1
          `
          console.log("product-check: Query 3 (User & Product GID) result:", settingsResult)
        }
      }

      if (settingsResult && settingsResult.length > 0) {
        const settings = settingsResult[0]
        const enabled = settings.bargaining_enabled === true
        console.log("product-check: Bargaining settings found:", settings)

        // Product title and image are not available from product_bargaining_settings
        // Use product_id as a fallback for title, and empty string for image
        const productTitle = settings.settings_product_id || "Product"
        const productPrice = settings.original_price || 0
        const productImage = "" // Not available from this table

        let minPricePercentage = null
        if (settings.min_price && productPrice > 0) {
          minPricePercentage = Math.round((settings.min_price / productPrice) * 100)
        }

        return NextResponse.json(
          {
            success: true,
            bargainingEnabled: enabled,
            message: enabled ? "Product bargaining enabled" : "Product bargaining disabled",
            productTitle,
            productPrice,
            productImage,
            minPrice: settings.min_price,
            minPricePercentage,
            bargainingBehavior: settings.behavior || "standard",
            debug: {
              foundSettings: true,
              settingsProductId: settings.settings_product_id,
              settingsVariantId: settings.settings_variant_id,
              queriedProductIdGID: productIdGID,
              queriedVariantIdGID: variantIdGID,
            },
          },
          { headers },
        )
      }
    } catch (err) {
      console.error("product-check: Error during DB query:", err)
      // Fall through to "no settings found"
    }

    console.log("product-check: No bargaining settings found after all queries for:", {
      shop,
      productIdGID,
      variantIdGID,
    })
    return NextResponse.json(
      {
        success: true,
        bargainingEnabled: false,
        message: "No bargaining settings found for this product/variant",
        productTitle: "Product",
        productPrice: 0,
        productImage: "",
        minPrice: null,
        minPricePercentage: null,
        bargainingBehavior: null,
        debug: { shop, productIdGID, variantIdGID, searchAttempted: true },
      },
      { headers },
    )
  } catch (error) {
    console.error("product-check: Outer error handler:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        bargainingEnabled: false,
      },
      { status: 500, headers },
    )
  }
}
