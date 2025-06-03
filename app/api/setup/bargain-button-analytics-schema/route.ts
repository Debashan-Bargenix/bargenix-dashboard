import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { DATABASE_URL } from "@/lib/db"
import fs from "fs"
import path from "path"

const sql = neon(DATABASE_URL)

export async function GET() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "db", "bargain-button-analytics.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    await sql(sqlContent)

    return NextResponse.json({
      success: true,
      message: "Bargain button analytics schema created successfully",
    })
  } catch (error) {
    console.error("Error creating bargain button analytics schema:", error)
    return NextResponse.json({ success: false, error: "Failed to create schema" }, { status: 500 })
  }
}
