import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`Fetching script tags for shop: ${shop}`)

    // Get script tags from our database
    const dbQuery = `
      SELECT * FROM shopify_script_tags 
      WHERE shop = $1 AND script_type = 'widget'
      ORDER BY created_at DESC
    `
    const dbScriptTags = await queryDb(dbQuery, [shop])
    console.log(`Found ${dbScriptTags.length} script tags in database`)

    // Get connected store info
    const storeQuery = `
      SELECT s.id, s.shop_domain, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shop])

    if (!storeResult.length) {
      console.log(`Store not found in database: ${shop}`)
      return NextResponse.json({
        database: dbScriptTags,
        shopify: [],
        message: "Store not found in database",
      })
    }

    const store = storeResult[0]
    console.log(`Found store: ${store.shop_domain}`)

    // Get script tags from Shopify
    let shopifyScriptTags = []
    try {
      console.log(`Fetching script tags from Shopify for ${shop}`)
      const shopifyResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
        },
      })

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text()
        console.error(`Shopify API error (${shopifyResponse.status}): ${errorText}`)
        throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
      }

      const data = await shopifyResponse.json()
      shopifyScriptTags = data.script_tags || []
      console.log(`Found ${shopifyScriptTags.length} script tags in Shopify`)
    } catch (error) {
      console.error("Error fetching script tags from Shopify:", error)
      return NextResponse.json({
        database: dbScriptTags,
        shopify: [],
        error: `Error fetching from Shopify: ${error.message}`,
      })
    }

    return NextResponse.json({
      database: dbScriptTags,
      shopify: shopifyScriptTags,
    })
  } catch (error) {
    console.error("Error in script-tags GET route:", error)
    return NextResponse.json({ error: `Failed to fetch script tags: ${error.message}` }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`Registering script tag for shop: ${shop}`)

    // Get store info
    const storeQuery = `
      SELECT s.id, s.shop_domain, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shop])

    if (!storeResult.length) {
      console.log(`Store not found: ${shop}`)
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const store = storeResult[0]
    console.log(`Found store: ${store.shop_domain} with access token`)

    // First, check if there are any existing script tags in Shopify
    console.log(`Checking for existing script tags in Shopify for ${shop}`)
    try {
      const shopifyGetResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
        },
      })

      if (!shopifyGetResponse.ok) {
        const errorText = await shopifyGetResponse.text()
        console.error(`Error fetching script tags from Shopify (${shopifyGetResponse.status}): ${errorText}`)
      } else {
        const existingScripts = await shopifyGetResponse.json()
        console.log(`Found ${existingScripts.script_tags.length} existing script tags in Shopify`)

        // Delete any existing Bargenix script tags
        for (const script of existingScripts.script_tags) {
          if (
            script.src.includes("bargain-widget.js") ||
            script.src.includes("bargenix") ||
            script.src.includes("widget.js")
          ) {
            console.log(`Deleting existing script tag: ${script.id}`)
            try {
              const deleteResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags/${script.id}.json`, {
                method: "DELETE",
                headers: {
                  "X-Shopify-Access-Token": store.access_token,
                },
              })

              if (!deleteResponse.ok) {
                console.error(`Error deleting script tag ${script.id}: ${await deleteResponse.text()}`)
              } else {
                console.log(`Successfully deleted script tag ${script.id}`)
              }
            } catch (error) {
              console.error(`Error deleting script tag ${script.id}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing script tags:", error)
    }

    // Check if script tag already exists in our database
    const checkQuery = `
      SELECT id FROM shopify_script_tags 
      WHERE shop = $1 AND script_type = 'widget'
    `
    const existingScripts = await queryDb(checkQuery, [shop])

    if (existingScripts.length > 0) {
      console.log(`Deleting ${existingScripts.length} existing script tags from database`)
      // Delete existing script tags from our database
      const deleteQuery = `
        DELETE FROM shopify_script_tags 
        WHERE shop = $1 AND script_type = 'widget'
      `
      await queryDb(deleteQuery, [shop])
    }

    // Register the script tag with Shopify
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-bargenix-dashbooard-neon.vercel.app"
    const timestamp = Date.now() // Add timestamp for cache busting
    const scriptUrl = `${appUrl}/bargain-widget.js?shop=${shop}&v=${timestamp}`

    console.log(`Registering script tag with URL: ${scriptUrl}`)

    try {
      const shopifyResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          script_tag: {
            event: "onload",
            src: scriptUrl,
            display_scope: "online_store",
            cache: false,
          },
        }),
      })

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text()
        console.error(`Error registering script tag with Shopify (${shopifyResponse.status}): ${errorText}`)
        return NextResponse.json(
          { error: `Failed to register script tag with Shopify: ${shopifyResponse.status} - ${errorText}` },
          { status: shopifyResponse.status },
        )
      }

      const scriptTagData = await shopifyResponse.json()
      console.log(`Script tag registered successfully:`, scriptTagData.script_tag)

      // Store the script tag ID in the database
      const insertQuery = `
        INSERT INTO shopify_script_tags (shop, script_tag_id, script_type, created_at)
        VALUES ($1, $2, $3, NOW())
      `
      await queryDb(insertQuery, [shop, scriptTagData.script_tag.id, "widget"])

      return NextResponse.json({
        success: true,
        message: "Script tag registered successfully",
        scriptTag: scriptTagData.script_tag,
      })
    } catch (error) {
      console.error("Error in Shopify API call:", error)
      return NextResponse.json(
        { error: `Failed to register script tag with Shopify: ${error.message}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in script-tags POST route:", error)
    return NextResponse.json({ error: `Failed to register script tag: ${error.message}` }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")
    const id = searchParams.get("id")

    if (!shop || !id) {
      return NextResponse.json({ error: "Shop and ID parameters are required" }, { status: 400 })
    }

    console.log(`Deleting script tag ${id} for shop ${shop}`)

    // Get store info
    const storeQuery = `
      SELECT s.id, s.shop_domain, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shop])

    if (!storeResult.length) {
      console.log(`Store not found: ${shop}`)
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const store = storeResult[0]
    console.log(`Found store: ${store.shop_domain}`)

    // Delete script tag from Shopify
    try {
      console.log(`Deleting script tag ${id} from Shopify`)
      const shopifyResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags/${id}.json`, {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": store.access_token,
        },
      })

      if (!shopifyResponse.ok && shopifyResponse.status !== 404) {
        const errorText = await shopifyResponse.text()
        console.error(`Error deleting script tag from Shopify (${shopifyResponse.status}): ${errorText}`)
      } else {
        console.log(`Successfully deleted script tag ${id} from Shopify`)
      }
    } catch (error) {
      console.error("Error deleting script tag from Shopify:", error)
    }

    // Delete script tag from our database
    console.log(`Deleting script tag ${id} from database`)
    const deleteQuery = `
      DELETE FROM shopify_script_tags 
      WHERE shop = $1 AND script_tag_id = $2
    `
    await queryDb(deleteQuery, [shop, id])

    return NextResponse.json({
      success: true,
      message: "Script tag deleted successfully",
    })
  } catch (error) {
    console.error("Error in script-tags DELETE route:", error)
    return NextResponse.json({ error: `Failed to delete script tag: ${error.message}` }, { status: 500 })
  }
}
