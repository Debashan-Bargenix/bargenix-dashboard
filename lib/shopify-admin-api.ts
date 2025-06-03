import { queryDb } from "@/lib/db"

export async function getShopifyAdminApiClient(shopDomain: string) {
  try {
    // Get access token from database
    const query = `
      SELECT t.access_token
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const result = await queryDb(query, [shopDomain])

    if (!result.length || !result[0].access_token) {
      console.log(`Access token not found for shop: ${shopDomain}`)
      return null
    }

    const accessToken = result[0].access_token

    // Return a simple client object that uses fetch instead of shopify-api-node
    return {
      accessToken,
      shopDomain,
      async get(endpoint: string) {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-04/${endpoint}`, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        })

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`)
        }

        return response.json()
      },
      async post(endpoint: string, data: any) {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-04/${endpoint}`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`)
        }

        return response.json()
      },
      async put(endpoint: string, data: any) {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-04/${endpoint}`, {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`)
        }

        return response.json()
      },
      async delete(endpoint: string) {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-04/${endpoint}`, {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        })

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`)
        }

        return response.status === 204 ? null : response.json()
      },
      async graphql(query: string, variables: any = {}) {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-04/graphql.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        })

        if (!response.ok) {
          throw new Error(`Shopify GraphQL API error: ${response.statusText}`)
        }

        const json = await response.json()

        if (json.errors) {
          console.error("GraphQL errors:", json.errors)
          throw new Error(`Shopify GraphQL API returned errors: ${json.errors.map((e: any) => e.message).join(", ")}`)
        }

        return json.data
      },
    }
  } catch (error) {
    console.error("Error creating Shopify admin API client:", error)
    return null
  }
}

// Add the getShopifyAdminClient function to maintain compatibility
export async function getShopifyAdminClient(userId: number) {
  try {
    // Get the shop domain for the user
    const storeQuery = `
      SELECT shop_domain
      FROM shopify_stores
      WHERE user_id = $1 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [userId])

    if (!storeResult.length || !storeResult[0].shop_domain) {
      console.log(`No active store found for user: ${userId}`)
      return null
    }

    const shopDomain = storeResult[0].shop_domain

    // Use the existing function to get the client
    return getShopifyAdminApiClient(shopDomain)
  } catch (error) {
    console.error("Error getting Shopify admin client:", error)
    return null
  }
}

export async function getShopifyStore(userId: string) {
  if (!userId) return null

  try {
    const query = `
      SELECT s.*, t.access_token, t.scope 
      FROM shopify_stores s
      LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `

    const result = await queryDb(query, [userId])

    if (result && result.length > 0) {
      return {
        id: result[0].id,
        domain: result[0].shop_domain,
        name: result[0].shop_name,
        email: result[0].shop_email,
        accessToken: result[0].access_token,
        scope: result[0].scope,
        status: result[0].status,
        createdAt: result[0].created_at,
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching Shopify store:", error)
    throw new Error("Failed to fetch Shopify store data")
  }
}
