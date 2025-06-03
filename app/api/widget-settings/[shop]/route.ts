import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

// GET /api/widget-settings/[shop]
export async function GET(request: NextRequest, { params }: { params: { shop: string } }) {
  try {
    const shop = params.shop

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`Fetching widget settings for shop: ${shop}`)

    // Query the database for widget settings
    const query = `
      SELECT 
        label, bg_color, text_color, font_size, border_radius, position, updated_at
      FROM 
        widget_settings
      WHERE 
        shop = $1
    `

    const result = await queryDb(query, [shop])

    // If no settings found, return default settings
    if (!result.length) {
      console.log(`No settings found for shop: ${shop}, returning defaults`)
      return NextResponse.json(
        {
          label: "Bargain a Deal",
          bg_color: "#2E66F8",
          text_color: "#FFFFFF",
          font_size: "16px",
          border_radius: "8px",
          position: "bottom_right",
          updated_at: new Date().toISOString(),
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      )
    }

    console.log(`Found settings for shop: ${shop}`, result[0])

    // Set CORS headers to allow access from Shopify stores
    return NextResponse.json(result[0], {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching widget settings:", error)
    return NextResponse.json({ error: `Failed to fetch widget settings: ${error.message}` }, { status: 500 })
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
