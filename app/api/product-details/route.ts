import { type NextRequest, NextResponse } from "next/server"
import { getShopifyAdminApiClient } from "@/lib/shopify-admin-api"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shopDomain = searchParams.get("shop")
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId")

    if (!shopDomain || !productId) {
      return NextResponse.json({ success: false, error: "Shop domain and product ID are required" }, { status: 400 })
    }

    // For widget calls, we don't have a user session, so we need to get the access token directly
    // This assumes the shopify_stores table has the necessary access token for the shopDomain
    const shopify = await getShopifyAdminApiClient(shopDomain)

    if (!shopify) {
      return NextResponse.json({ success: false, error: "Shopify client not initialized" }, { status: 500 })
    }

    // GraphQL query to fetch product and variant details
    const query = `
      query getProductDetails($productId: ID!, $variantId: ID!) {
        product(id: $productId) {
          id
          title
          handle
          productType
          vendor
          tags
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1, query: $variantId) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                compareAtPrice
              }
            }
          }
          collections(first: 10) {
            edges {
              node {
                title
              }
            }
          }
        }
      }
    `

    // Shopify Product ID and Variant ID are typically in the format "gid://shopify/Product/1234567890"
    // Ensure the IDs are in the correct GID format for GraphQL
    const formattedProductId = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`
    const formattedVariantId =
      variantId && variantId.startsWith("gid://") ? variantId : `gid://shopify/ProductVariant/${variantId}`

    const variables = {
      productId: formattedProductId,
      variantId: formattedVariantId,
    }

    const data = await shopify.graphql(query, variables)

    if (!data || !data.product) {
      return NextResponse.json({ success: false, error: "Product not found or no data returned" }, { status: 404 })
    }

    const product = data.product
    const variant = product.variants.edges[0]?.node

    const productDetails = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      productType: product.productType,
      vendor: product.vendor,
      tags: product.tags,
      imageUrl: product.images.edges[0]?.node?.url || null,
      variantId: variant?.id || null,
      variantTitle: variant?.title || null,
      price: Number.parseFloat(variant?.price?.amount || "0"),
      compareAtPrice: Number.parseFloat(variant?.compareAtPrice?.amount || "0"),
      sku: variant?.sku || null,
      inventoryQuantity: variant?.inventoryQuantity || 0,
      currencyCode: variant?.price?.currencyCode || "USD",
      collections: product.collections.edges.map((edge) => edge.node.title),
    }

    return NextResponse.json({ success: true, product: productDetails })
  } catch (error) {
    console.error("Error fetching product details:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
