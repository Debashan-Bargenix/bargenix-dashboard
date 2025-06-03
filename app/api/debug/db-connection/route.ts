import { NextResponse } from "next/server"
import { queryDb } from "@/lib/db"

export async function GET() {
  try {
    // Test the database connection
    const result = await queryDb("SELECT NOW() as time")

    // Check if the bargain_events table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_events'
      );
    `)

    // Get the count of events in the table
    let eventCount = 0
    if (tableCheck[0].exists) {
      const countResult = await queryDb("SELECT COUNT(*) as count FROM bargain_events")
      eventCount = countResult[0].count
    }

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      time: result[0].time,
      bargainEventsTableExists: tableCheck[0].exists,
      eventCount: eventCount,
    })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
