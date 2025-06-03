"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Install script tag on Shopify
export async function installBargainButton(shopDomain: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get store access token
    const storeQuery = `
      SELECT s.id, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1 AND s.user_id = $2
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shopDomain, user.id])

    if (storeResult.length === 0) {
      return { success: false, error: "Store not found or not connected" }
    }

    const { access_token } = storeResult[0]

    // First, remove any existing bargain button scripts
    await removeExistingScripts(shopDomain, access_token)

    // Generate script URL with cache busting
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.bargenix.in"
    const timestamp = Date.now()
    const scriptUrl = `${appUrl}/bargain-button.js?shop=${shopDomain}&v=${timestamp}`

    // Register script tag with Shopify
    const shopifyResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": access_token,
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
      console.error(`Error registering script tag with Shopify (${shopifyResponse.status}):`, errorText)
      return {
        success: false,
        error: `Failed to register script tag with Shopify: ${shopifyResponse.status}`,
      }
    }

    const scriptTagData = await shopifyResponse.json()
    const scriptId = scriptTagData.script_tag.id

    // Store the script tag in our database using the shopify_script_tags table
    const insertQuery = `
      INSERT INTO shopify_script_tags (shop, script_tag_id, script_type, created_at, user_id)
      VALUES ($1, $2, $3, NOW(), $4)
    `

    await queryDb(insertQuery, [shopDomain, scriptId.toString(), "widget", user.id])

    // Revalidate the page
    revalidatePath("/dashboard/chatbot")

    return {
      success: true,
      scriptId,
      message: "Bargain button installed successfully",
    }
  } catch (error) {
    console.error("Error installing bargain button:", error)
    return { success: false, error: error.message }
  }
}

// Uninstall script tag from Shopify
export async function uninstallBargainButton(shopDomain: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get store access token
    const storeQuery = `
      SELECT s.id, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1 AND s.user_id = $2
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shopDomain, user.id])

    if (storeResult.length === 0) {
      return { success: false, error: "Store not found or not connected" }
    }

    const { access_token } = storeResult[0]

    // Remove existing scripts from Shopify
    const result = await removeExistingScripts(shopDomain, access_token)

    // Delete from shopify_script_tags table
    const deleteQuery = `
      DELETE FROM shopify_script_tags 
      WHERE shop = $1 AND script_type = 'widget'
    `
    await queryDb(deleteQuery, [shopDomain])

    // Revalidate the page
    revalidatePath("/dashboard/chatbot")

    return {
      success: true,
      message: `Removed ${result.count} bargain button script(s)`,
    }
  } catch (error) {
    console.error("Error uninstalling bargain button:", error)
    return { success: false, error: error.message }
  }
}

// Check if script is installed
export async function checkBargainButtonStatus(shopDomain: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated", installed: false }
    }

    // Get store access token
    const storeQuery = `
      SELECT s.id, t.access_token 
      FROM shopify_stores s
      JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.shop_domain = $1 AND s.user_id = $2
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    const storeResult = await queryDb(storeQuery, [shopDomain, user.id])

    if (storeResult.length === 0) {
      return { success: false, error: "Store not found or not connected", installed: false }
    }

    const { access_token } = storeResult[0]

    // Get all script tags from Shopify
    const shopifyResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      headers: {
        "X-Shopify-Access-Token": access_token,
      },
    })

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text()
      console.error(`Error getting script tags from Shopify (${shopifyResponse.status}):`, errorText)
      return {
        success: false,
        error: `Failed to get script tags from Shopify: ${shopifyResponse.status}`,
        installed: false,
      }
    }

    const scriptTagsData = await shopifyResponse.json()
    const scriptTags = scriptTagsData.script_tags

    // Filter for our bargain button scripts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.bargenix.in"
    const bargainButtonScripts = scriptTags.filter(
      (script) => script.src.includes("/bargain-button.js") || script.src.includes(`${appUrl}/bargain-button.js`),
    )

    return {
      success: true,
      installed: bargainButtonScripts.length > 0,
      scripts: bargainButtonScripts,
    }
  } catch (error) {
    console.error("Error checking bargain button status:", error)
    return { success: false, error: error.message, installed: false }
  }
}

// Helper function to remove existing scripts
async function removeExistingScripts(shopDomain: string, accessToken: string) {
  try {
    // Get all script tags from Shopify
    const shopifyResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    })

    if (!shopifyResponse.ok) {
      console.error(`Error getting script tags from Shopify (${shopifyResponse.status})`)
      return { success: false, count: 0 }
    }

    const scriptTagsData = await shopifyResponse.json()
    const scriptTags = scriptTagsData.script_tags

    // Filter for our bargain button scripts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.bargenix.in"
    const bargainButtonScripts = scriptTags.filter(
      (script) =>
        script.src.includes("/bargain-button.js") ||
        script.src.includes(`${appUrl}/bargain-button.js`) ||
        script.src.includes("bargenix") ||
        script.src.includes("bargain"),
    )

    // Delete each script tag from Shopify
    let deletedCount = 0
    for (const script of bargainButtonScripts) {
      try {
        const deleteResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags/${script.id}.json`, {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        })

        if (deleteResponse.ok) {
          deletedCount++
        }
      } catch (error) {
        console.error(`Error deleting script tag ${script.id}:`, error)
      }
    }

    return { success: true, count: deletedCount }
  } catch (error) {
    console.error("Error removing existing scripts:", error)
    return { success: false, count: 0 }
  }
}
