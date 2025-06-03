import { queryDb } from "@/lib/db"

/**
 * Safely executes a database query with proper error handling
 * @param query SQL query string
 * @param params Query parameters
 * @returns Query result or null on error
 */
export async function safeQuery<T = any>(query: string, params: any[] = []): Promise<T[] | null> {
  try {
    const result = await queryDb(query, params)
    return result as T[]
  } catch (error) {
    console.error("Database query error:", error)
    return null
  }
}

/**
 * Safely executes a database transaction with proper error handling
 * @param queries Array of {query, params} objects to execute in transaction
 * @returns Success status and optional error message
 */
export async function safeTransaction(
  queries: Array<{ query: string; params: any[] }>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Begin transaction
    await queryDb("BEGIN")

    // Execute all queries
    for (const { query, params } of queries) {
      await queryDb(query, params)
    }

    // Commit transaction
    await queryDb("COMMIT")
    return { success: true }
  } catch (error) {
    // Rollback on error
    try {
      await queryDb("ROLLBACK")
    } catch (rollbackError) {
      console.error("Error during transaction rollback:", rollbackError)
    }

    console.error("Transaction error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected database error occurred",
    }
  }
}
