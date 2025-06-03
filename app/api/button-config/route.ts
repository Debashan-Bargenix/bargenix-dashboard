import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const shop = request.nextUrl.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter is required" }, { status: 400 })
    }

    // Get settings from database
    const query = `
      SELECT * FROM bargain_button_customizations
      WHERE shop_domain = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `

    const result = await queryDb(query, [shop])

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        settings: {
          button_text: "Bargain a Deal",
          button_position: "after-buy-button",
          button_color: "#4F46E5",
          text_color: "#FFFFFF",
          border_radius: "8px",
          font_size: "14px",
          padding: "10px 15px",
          smart_mode: true,
          custom_css: "",
        },
      })
    }

    return NextResponse.json({ success: true, settings: result[0] })
  } catch (error) {
    console.error("Error serving button config:", error)
    return NextResponse.json({ success: false, error: "Failed to get button configuration" }, { status: 500 })
  }
}
