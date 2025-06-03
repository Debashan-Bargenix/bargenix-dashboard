import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { checkDatabaseConnection, verifyDatabaseSchema } from "@/lib/db-verify"

export async function GET() {
  try {
    // Get current user to verify authentication
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    // Check database connection
    const connectionResult = await checkDatabaseConnection()

    // If connection failed, return early
    if (!connectionResult.success) {
      return NextResponse.json({
        success: false,
        connection: connectionResult,
        schema: { success: false, message: "Skipped schema check due to connection failure" },
        message: "Database connection failed",
      })
    }

    // Verify database schema
    const schemaResult = await verifyDatabaseSchema()

    return NextResponse.json({
      success: connectionResult.success && schemaResult.success,
      connection: connectionResult,
      schema: schemaResult,
      message: schemaResult.success
        ? "Database connection and schema verification successful"
        : "Database schema verification failed",
    })
  } catch (error: any) {
    console.error("Error in database check route:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An error occurred",
      },
      { status: 500 },
    )
  }
}
