import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const sql = neon(DATABASE_URL)

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "db", "update-bargain-requests.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    await sql.raw(sqlContent)

    return NextResponse.json({
      success: true,
      message: "Bargain requests table updated successfully",
    })
  } catch (error) {
    console.error("Error updating bargain requests table:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update bargain requests table",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
