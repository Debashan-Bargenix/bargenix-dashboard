import { queryDb } from "./db"

// List of all required tables
const requiredTables = [
  "users",
  "sessions",
  "membership_plans",
  "user_memberships",
  "shopify_stores",
  "shopify_auth_tokens",
  "shopify_nonce_tokens",
  "shopify_uninstall_events",
  "widget_settings",
  "shopify_products",
  "product_bargaining_settings",
  "user_bargaining_limits",
  "user_notifications",
  "user_preferences",
  "user_activity",
]

// Function to check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await queryDb(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `,
      [tableName],
    )

    return result[0].exists
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error)
    return false
  }
}

// Function to verify all required tables exist
export async function verifyDatabaseSchema(): Promise<{
  success: boolean
  missingTables: string[]
  message: string
}> {
  try {
    const missingTables: string[] = []

    // Check each table
    for (const table of requiredTables) {
      const exists = await tableExists(table)
      if (!exists) {
        missingTables.push(table)
      }
    }

    if (missingTables.length === 0) {
      return {
        success: true,
        missingTables: [],
        message: "All required database tables exist",
      }
    } else {
      return {
        success: false,
        missingTables,
        message: `Missing tables: ${missingTables.join(", ")}`,
      }
    }
  } catch (error) {
    console.error("Error verifying database schema:", error)
    return {
      success: false,
      missingTables: [],
      message: `Error verifying database schema: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Function to check database connection
export async function checkDatabaseConnection(): Promise<{
  success: boolean
  message: string
}> {
  try {
    // Simple query to check connection
    await queryDb("SELECT 1")
    return {
      success: true,
      message: "Database connection successful",
    }
  } catch (error) {
    console.error("Database connection error:", error)
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
