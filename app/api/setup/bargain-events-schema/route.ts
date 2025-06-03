import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "db", "bargain-events-schema.sql")
    const sqlQuery = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL query
    await queryDb(sqlQuery)

    return NextResponse.json({
      success: true,
      message: "Bargain events schema created successfully",
    })
  } catch (error) {
    console.error("Error creating bargain events schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create bargain events schema",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
