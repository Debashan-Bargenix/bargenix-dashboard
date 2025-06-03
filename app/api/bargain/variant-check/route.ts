import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"

const sql = neon(DATABASE_URL)

export async function GET(request: NextRequest) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 })
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const variantId = searchParams.get("variantId")

    // Validate required parameters
    if (!variantId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing variant ID",
        },
        { status: 400, headers },
      )
    }

    // Check if the variant exists in the database
    const result = await sql`
      SELECT 
        variant_id, 
        bargaining_enabled, 
        min_price, 
        behavior
      FROM product_bargaining_settings
      WHERE variant_id = ${variantId}
      LIMIT 1
    `

    if (result && result.length > 0) {
      return NextResponse.json(
        {
          success: true,
          found: true,
          settings: result[0],
        },
        { headers },
      )
    } else {
      return NextResponse.json(
        {
          success: true,
          found: false,
          message: "Variant not found in bargaining settings",
        },
        { headers },
      )
    }
  } catch (error) {
    console.error("Error checking variant:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500, headers },
    )
  }
}
