"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Get the connected Shopify store for the current user
export async function getConnectedShopifyStore() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    const query = `
      SELECT shop_domain 
      FROM shopify_stores 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `
    const result = await queryDb(query, [user.id])

    if (result.length === 0) {
      return null
    }

    return result[0].shop_domain
  } catch (error) {
    console.error("Error getting connected Shopify store:", error)
    return null
  }
}

// Get widget settings for a shop
export async function getWidgetSettings(shop: string) {
  try {
    if (!shop) {
      return null
    }

    const query = `
      SELECT 
        label, bg_color, text_color, font_size, border_radius, position, updated_at
      FROM 
        widget_settings
      WHERE 
        shop = $1
    `
    const result = await queryDb(query, [shop])

    if (result.length === 0) {
      return {
        label: "Bargain a Deal",
        bg_color: "#2E66F8",
        text_color: "#FFFFFF",
        font_size: "16px",
        border_radius: "8px",
        position: "bottom_right",
      }
    }

    return result[0]
  } catch (error) {
    console.error("Error getting widget settings:", error)
    return null
  }
}

// Save widget settings
export async function saveWidgetSettings(shop: string, settings: any) {
  try {
    if (!shop) {
      throw new Error("Shop is required")
    }

    // Check if settings exist
    const checkQuery = `
      SELECT id FROM widget_settings WHERE shop = $1
    `
    const existingSettings = await queryDb(checkQuery, [shop])

    if (existingSettings.length === 0) {
      // Insert new settings
      const insertQuery = `
        INSERT INTO widget_settings 
          (shop, label, bg_color, text_color, font_size, border_radius, position, updated_at) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, NOW())
      `
      await queryDb(insertQuery, [
        shop,
        settings.label,
        settings.bg_color,
        settings.text_color,
        settings.font_size,
        settings.border_radius,
        settings.position,
      ])
    } else {
      // Update existing settings
      const updateQuery = `
        UPDATE widget_settings 
        SET 
          label = $2, 
          bg_color = $3, 
          text_color = $4, 
          font_size = $5, 
          border_radius = $6, 
          position = $7, 
          updated_at = NOW()
        WHERE 
          shop = $1
      `
      await queryDb(updateQuery, [
        shop,
        settings.label,
        settings.bg_color,
        settings.text_color,
        settings.font_size,
        settings.border_radius,
        settings.position,
      ])
    }

    return { success: true }
  } catch (error) {
    console.error("Error saving widget settings:", error)
    throw error
  }
}
