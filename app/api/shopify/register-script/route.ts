import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getShopifyAdminApiClient } from "@/lib/shopify-admin-api"

export async function POST(request: NextRequest) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`Registering script tag for shop: ${shop}`)

    // Get the Shopify admin API client
    const shopifyClient = await getShopifyAdminApiClient(shop)
    if (!shopifyClient) {
      return NextResponse.json({ error: "Failed to get Shopify admin API client" }, { status: 500 })
    }

    // Check if a script tag already exists in the database
    const existingScriptQuery = `
      SELECT script_tag_id FROM shopify_script_tags 
      WHERE shop = $1 AND script_type = 'widget'
    `
    const existingScriptResult = await queryDb(existingScriptQuery, [shop])

    // If a script tag exists in the database, delete it from Shopify
    if (existingScriptResult.length > 0) {
      const scriptTagId = existingScriptResult[0].script_tag_id
      console.log(`Deleting existing script tag with ID: ${scriptTagId}`)

      try {
        await shopifyClient.scriptTag.delete(scriptTagId)
        console.log(`Deleted script tag with ID: ${scriptTagId} from Shopify`)
      } catch (error) {
        console.warn(`Failed to delete script tag from Shopify: ${error.message}`)
        // Continue anyway, as the script tag might not exist in Shopify anymore
      }

      // Delete from database
      const deleteQuery = `
        DELETE FROM shopify_script_tags 
        WHERE shop = $1 AND script_type = 'widget'
      `
      await queryDb(deleteQuery, [shop])
      console.log(`Deleted script tag record from database for shop: ${shop}`)
    }

    // Generate a cache-busting version parameter
    const version = Date.now().toString()

    // Create a new script tag
    const scriptTag = await shopifyClient.scriptTag.create({
      event: "onload",
      src: `https://v0-bargenix-dashboard-neon.vercel.app/widget/bargain-widget.js?v=${version}`,
      display_scope: "online_store",
      cache: false,
    })

    console.log(`Created new script tag with ID: ${scriptTag.id}`)

    // Save the script tag to the database
    const insertQuery = `
      INSERT INTO shopify_script_tags (shop, script_tag_id, script_type, created_at)
      VALUES ($1, $2, $3, NOW())
    `
    await queryDb(insertQuery, [shop, scriptTag.id, "widget"])

    return NextResponse.json({
      success: true,
      message: "Script tag registered successfully",
      scriptTag,
    })
  } catch (error) {
    console.error("Error registering script tag:", error)
    return NextResponse.json(
      {
        error: `Failed to register script tag: ${error.message}`,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
