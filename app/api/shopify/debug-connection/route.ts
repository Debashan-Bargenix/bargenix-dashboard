import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get environment variables
    const envCheck = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "✅ Set" : "❌ Missing",
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "✅ Set" : "❌ Missing",
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES ? process.env.SHOPIFY_SCOPES : "Using default scopes",
      APP_URL: process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : "❌ Missing",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
    }

    // Check database connection
    let dbStatus = "❌ Failed"
    let storeData = null
    let tokenData = null
    let nonceData = null
    const tableStatus = {}

    try {
      // Test a simple query
      const testResult = await queryDb("SELECT 1 as test")
      dbStatus = testResult[0].test === 1 ? "✅ Connected" : "❌ Failed"

      // Check if required tables exist
      const tables = ["shopify_stores", "shopify_auth_tokens", "shopify_nonce_tokens", "shopify_uninstall_events"]

      for (const table of tables) {
        try {
          await queryDb(`SELECT COUNT(*) FROM ${table}`)
          tableStatus[table] = "✅ Exists"
        } catch (error) {
          tableStatus[table] = "❌ Missing"
        }
      }

      // Get store data for current user
      storeData = await queryDb(
        `SELECT id, shop_domain, shop_name, status, created_at, updated_at 
         FROM shopify_stores 
         WHERE user_id = $1 
         ORDER BY updated_at DESC 
         LIMIT 5`,
        [user.id],
      )

      // Get token data (without exposing actual tokens)
      if (storeData && storeData.length > 0) {
        tokenData = await queryDb(
          `SELECT store_id, 
                  CASE WHEN access_token IS NOT NULL THEN '✅ Present' ELSE '❌ Missing' END as token_status,
                  created_at, updated_at 
           FROM shopify_auth_tokens 
           WHERE store_id = $1`,
          [storeData[0].id],
        )
      }

      // Get active nonce tokens
      nonceData = await queryDb(
        `SELECT id, 
                LEFT(nonce, 8) || '...' as nonce_preview, 
                expires_at 
         FROM shopify_nonce_tokens 
         WHERE expires_at > NOW() 
         ORDER BY expires_at DESC 
         LIMIT 5`,
      )
    } catch (error) {
      console.error("Database check error:", error)
    }

    // Construct callback URL for verification
    const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
      : null

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      environment: envCheck,
      database: {
        status: dbStatus,
        tables: tableStatus,
      },
      shopify: {
        callbackUrl,
        stores: storeData,
        tokens: tokenData,
        activeNonces: nonceData,
      },
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
