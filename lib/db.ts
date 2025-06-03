import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Export the DATABASE_URL for use in other modules
export const DATABASE_URL = process.env.DATABASE_URL!

// Create a SQL client with the Neon connection
export const sql = neon(DATABASE_URL)

// Create a Drizzle client with the Neon connection
export const db = drizzle(sql)

// Helper function to query the database with proper parameter handling
export async function queryDb(query: string, params: any[] = []) {
  try {
    // Important: Neon requires using tagged template literals for parameterized queries
    // This is a critical fix for the database connection issues
    if (params && params.length > 0) {
      // Use the sql tagged template literal for parameterized queries
      return await sql.query(query, params)
    } else {
      // For queries without parameters
      return await sql.query(query)
    }
  } catch (error) {
    console.error("Database query error:", error)
    // Log the query for debugging (without sensitive data)
    console.error("Failed query:", query.substring(0, 200) + "...")
    throw error
  }
}

// Transaction helper functions
export async function beginTransaction() {
  return await sql.query("BEGIN")
}

export async function commitTransaction() {
  return await sql.query("COMMIT")
}

export async function rollbackTransaction() {
  return await sql.query("ROLLBACK")
}

// Function to test database connection
export async function testConnection() {
  try {
    const result = await sql.query("SELECT 1 as test")
    return { connected: result[0]?.test === 1, error: null }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return { connected: false, error: String(error) }
  }
}
