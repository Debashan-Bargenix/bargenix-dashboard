import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || user.id

    // Check if user_preferences table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
      );
    `)

    if (!tableExists[0].exists) {
      // Return default values if table doesn't exist
      return NextResponse.json({
        theme: "system",
        language: "en",
      })
    }

    // Get user preferences
    const result = await queryDb(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId])

    if (result.length === 0) {
      // Return default values if no preferences are set
      return NextResponse.json({
        theme: "system",
        language: "en",
      })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json({ message: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Check if user_preferences table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
      );
    `)

    if (!tableExists[0].exists) {
      // Create the table if it doesn't exist
      await queryDb(`
        CREATE TABLE user_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          theme VARCHAR(20) DEFAULT 'system',
          language VARCHAR(10) DEFAULT 'en',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `)
    }

    // Update or insert user preferences
    await queryDb(
      `INSERT INTO user_preferences 
       (user_id, theme, language, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET
         theme = $2,
         language = $3,
         updated_at = NOW()`,
      [user.id, data.theme, data.language],
    )

    // Log activity
    try {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'settings_change', 'User preferences updated', $2, NOW())`,
        [user.id, "127.0.0.1"],
      )
    } catch (error) {
      console.error("Error logging activity:", error)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
    })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ message: "Failed to update preferences" }, { status: 500 })
  }
}
