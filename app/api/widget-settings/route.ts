import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop, label, bg_color, text_color, font_size, border_radius, position } = body

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`Saving widget settings for shop: ${shop}`, body)

    // Check if settings exist
    const checkQuery = `
      SELECT id FROM widget_settings WHERE shop = $1
    `
    const existingSettings = await queryDb(checkQuery, [shop])

    if (existingSettings.length === 0) {
      // Insert new settings
      console.log(`No existing settings found for ${shop}, creating new record`)
      const insertQuery = `
        INSERT INTO widget_settings 
          (shop, label, bg_color, text_color, font_size, border_radius, position, updated_at) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, NOW())
      `
      await queryDb(insertQuery, [
        shop,
        label || "Bargain a Deal",
        bg_color || "#2E66F8",
        text_color || "#FFFFFF",
        font_size || "16px",
        border_radius || "8px",
        position || "inline",
      ])
    } else {
      // Update existing settings
      console.log(`Updating existing settings for ${shop}`)
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
        label || "Bargain a Deal",
        bg_color || "#2E66F8",
        text_color || "#FFFFFF",
        font_size || "16px",
        border_radius || "8px",
        position || "inline",
      ])
    }

    return NextResponse.json({
      success: true,
      message: "Widget settings saved successfully",
    })
  } catch (error) {
    console.error("Error saving widget settings:", error)
    return NextResponse.json({ error: `Failed to save widget settings: ${error.message}` }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    // Validate the shop belongs to the user
    const validateQuery = `
      SELECT id FROM shopify_stores 
      WHERE user_id = $1 AND shop_domain = $2
    `
    const validateResult = await queryDb(validateQuery, [user.id, shop])

    if (validateResult.length === 0) {
      return NextResponse.json({ error: "Shop not found or not owned by user" }, { status: 403 })
    }

    // Get the settings
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
      return NextResponse.json({
        label: "Bargain a Deal",
        bg_color: "#2E66F8",
        text_color: "#FFFFFF",
        font_size: "16px",
        border_radius: "8px",
        position: "bottom_right",
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching widget settings:", error)
    return NextResponse.json({ error: "Failed to fetch widget settings" }, { status: 500 })
  }
}
