import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET() {
  try {
    // Check if required tables exist
    const tables = await queryDb(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('shopify_stores', 'shopify_auth_tokens', 'shopify_nonce_tokens', 'shopify_webhooks')
    `)

    const existingTables = tables.map((t: any) => t.table_name)
    const requiredTables = ["shopify_stores", "shopify_auth_tokens", "shopify_nonce_tokens", "shopify_webhooks"]
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table))

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required tables: ${missingTables.join(", ")}`,
        existingTables,
        missingTables,
      })
    }

    return NextResponse.json({
      success: true,
      message: "All required tables exist",
      tables: existingTables,
    })
  } catch (error: any) {
    console.error("Error checking schema:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An error occurred while checking the database schema",
        error: error.toString(),
      },
      { status: 500 },
    )
  }
}
