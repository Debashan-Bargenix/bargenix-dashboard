import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "db", "bargain-button-schema.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Execute the SQL
    await queryDb(sql)

    return NextResponse.json({ success: true, message: "Bargain button schema created successfully" })
  } catch (error) {
    console.error("Error creating bargain button schema:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
