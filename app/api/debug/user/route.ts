import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get user data
    const userData = await queryDb(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.company_name, 
        u.phone, u.bio, u.avatar_url, u.email_verified, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM user_activity WHERE user_id = u.id) as activity_count
      FROM users u
      WHERE u.id = $1
    `,
      [user.id],
    )

    // Get user activity
    const activity = await queryDb(
      `
      SELECT * FROM user_activity 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `,
      [user.id],
    )

    // Get user notifications
    const notifications = await queryDb(
      `
      SELECT * FROM user_notifications 
      WHERE user_id = $1
    `,
      [user.id],
    )

    // Get user preferences
    const preferences = await queryDb(
      `
      SELECT * FROM user_preferences 
      WHERE user_id = $1
    `,
      [user.id],
    )

    return NextResponse.json({
      user: userData[0] || null,
      activity,
      notifications: notifications[0] || null,
      preferences: preferences[0] || null,
    })
  } catch (error) {
    console.error("Error fetching user data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
