import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"

const sql = neon(DATABASE_URL)

export async function GET() {
  try {
    // Test basic database connectivity
    const result = await sql`SELECT 1 as test`

    // Get list of tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Check product_bargaining_settings table
    let bargainingSettings = []
    try {
      bargainingSettings = await sql`
        SELECT * FROM product_bargaining_settings LIMIT 5
      `
    } catch (err) {
      bargainingSettings = { error: err.message }
    }

    return NextResponse.json({
      success: true,
      dbConnected: result && result.length > 0 && result[0].test === 1,
      tables: tables.map((t) => t.table_name),
      bargainingSettings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
