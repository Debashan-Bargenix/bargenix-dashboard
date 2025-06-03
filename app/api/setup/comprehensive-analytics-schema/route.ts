import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "db", "comprehensive-analytics-schema.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    await queryDb(sqlContent)

    return NextResponse.json({
      success: true,
      message: "Comprehensive analytics schema created successfully",
    })
  } catch (error) {
    console.error("Error setting up comprehensive analytics schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set up comprehensive analytics schema",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
