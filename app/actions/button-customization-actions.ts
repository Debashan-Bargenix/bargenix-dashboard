"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Ensure the customization table exists
async function ensureCustomizationTableExists() {
  try {
    // Check if the table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_button_customizations'
      );
    `)

    if (!tableCheck[0].exists) {
      // Create the table if it doesn't exist
      await queryDb(`
        CREATE TABLE IF NOT EXISTS bargain_button_customizations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          shop_domain VARCHAR(255) NOT NULL,
          button_text VARCHAR(255) DEFAULT 'Bargain a Deal',
          button_position VARCHAR(50) DEFAULT 'after-buy-button',
          button_color VARCHAR(50) DEFAULT '#4F46E5',
          text_color VARCHAR(50) DEFAULT '#FFFFFF',
          border_radius VARCHAR(20) DEFAULT '8px',
          font_size VARCHAR(20) DEFAULT '14px',
          padding VARCHAR(50) DEFAULT '10px 15px',
          smart_mode BOOLEAN DEFAULT TRUE,
          custom_css TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, shop_domain)
        );
      `)
      console.log("Created bargain_button_customizations table")
    }

    return true
  } catch (error) {
    console.error("Error ensuring customization table exists:", error)
    return false
  }
}

// Get button customization settings
export async function getButtonCustomization(shopDomain: string) {
  try {
    await ensureCustomizationTableExists()

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Check if settings exist for this shop
    const query = `
      SELECT * FROM bargain_button_customizations
      WHERE user_id = $1 AND shop_domain = $2
    `
    const result = await queryDb(query, [user.id, shopDomain])

    if (result.length === 0) {
      // Create default settings
      const insertQuery = `
        INSERT INTO bargain_button_customizations 
        (user_id, shop_domain)
        VALUES ($1, $2)
        RETURNING *
      `
      const insertResult = await queryDb(insertQuery, [user.id, shopDomain])
      return { success: true, settings: insertResult[0] }
    }

    return { success: true, settings: result[0] }
  } catch (error) {
    console.error("Error getting button customization:", error)
    return { success: false, error: error.message }
  }
}

// Update button customization settings
export async function updateButtonCustomization(shopDomain: string, settings: any) {
  try {
    await ensureCustomizationTableExists()

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Update settings
    const updateQuery = `
      INSERT INTO bargain_button_customizations 
      (user_id, shop_domain, button_text, button_position, button_color, text_color, 
       border_radius, font_size, padding, smart_mode, custom_css, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id, shop_domain) 
      DO UPDATE SET 
        button_text = $3,
        button_position = $4,
        button_color = $5,
        text_color = $6,
        border_radius = $7,
        font_size = $8,
        padding = $9,
        smart_mode = $10,
        custom_css = $11,
        updated_at = NOW()
      RETURNING *
    `

    const updateResult = await queryDb(updateQuery, [
      user.id,
      shopDomain,
      settings.buttonText || "Bargain a Deal",
      settings.buttonPosition || "after-buy-button",
      settings.buttonColor || "#4F46E5",
      settings.textColor || "#FFFFFF",
      settings.borderRadius || "8px",
      settings.fontSize || "14px",
      settings.padding || "10px 15px",
      settings.smartMode !== undefined ? settings.smartMode : true,
      settings.customCss || null,
    ])

    // Revalidate the page
    revalidatePath("/dashboard/chatbot")

    // Reinstall the script to apply changes
    await reinstallScript(shopDomain)

    return { success: true, settings: updateResult[0] }
  } catch (error) {
    console.error("Error updating button customization:", error)
    return { success: false, error: error.message }
  }
}

// Save button text only
export async function saveButtonText(shopDomain: string, buttonText: string) {
  try {
    await ensureCustomizationTableExists()

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Validate button text
    if (!buttonText || buttonText.trim() === "") {
      return { success: false, error: "Button text cannot be empty" }
    }

    // Limit button text length
    const trimmedText = buttonText.trim().substring(0, 30)

    // Update button text only
    const updateQuery = `
      INSERT INTO bargain_button_customizations 
      (user_id, shop_domain, button_text, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, shop_domain) 
      DO UPDATE SET 
        button_text = $3,
        updated_at = NOW()
      RETURNING *
    `

    const updateResult = await queryDb(updateQuery, [user.id, shopDomain, trimmedText])

    // Revalidate the page
    revalidatePath("/dashboard/chatbot")

    // Reinstall the script to apply changes
    await reinstallScript(shopDomain)

    return { success: true, settings: updateResult[0] }
  } catch (error) {
    console.error("Error saving button text:", error)
    return { success: false, error: error.message }
  }
}

// Helper function to reinstall the script
async function reinstallScript(shopDomain: string) {
  try {
    const { installBargainButton, uninstallBargainButton } = await import("./bargain-button-actions")

    // Uninstall first
    await uninstallBargainButton(shopDomain)

    // Then reinstall
    await installBargainButton(shopDomain)

    return true
  } catch (error) {
    console.error("Error reinstalling script:", error)
    return false
  }
}
