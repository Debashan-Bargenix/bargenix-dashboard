import { NextResponse } from "next/server"
import { queryDb, beginTransaction, commitTransaction, rollbackTransaction } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sql } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "No SQL provided" }, { status: 400 })
    }

    // Split the SQL into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    // Execute the statements in a transaction
    try {
      await beginTransaction()

      const results = []
      for (const statement of statements) {
        try {
          const result = await queryDb(statement)
          results.push({ success: true, statement: statement.substring(0, 50) + "..." })
        } catch (error) {
          results.push({
            success: false,
            statement: statement.substring(0, 50) + "...",
            error: String(error),
          })
          throw error // Rethrow to trigger rollback
        }
      }

      await commitTransaction()

      return NextResponse.json({
        success: true,
        message: "Database schema updated successfully",
        results,
      })
    } catch (error) {
      await rollbackTransaction()
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update database schema",
          error: String(error),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error fixing database schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
