import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get the SQL script content
    const sqlPath = path.join(process.cwd(), "db", "bargain-requests-schema.sql")
    const sqlScript = fs.readFileSync(sqlPath, "utf8")

    // Connect to the database
    const sql = neon(process.env.DATABASE_URL!)

    // Execute the SQL script
    await sql.query(sqlScript)

    return NextResponse.json({
      success: true,
      message: "Bargain requests schema created successfully",
    })
  } catch (error) {
    console.error("Error setting up bargain requests schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
