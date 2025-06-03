import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get("limit") || "10"

    // Check if user_activity table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    if (!tableExists[0]?.exists) {
      // Return some basic activity based on user login
      return NextResponse.json({
        data: [
          {
            id: 1,
            activity_type: "login",
            description: "Logged in to account",
            created_at: new Date().toISOString(),
          },
        ],
      })
    }

    // Get recent activity
    const activityResult = await queryDb(
      `
      SELECT * FROM user_activity
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [user.id, limit],
    )

    return NextResponse.json({
      data: activityResult,
    })
  } catch (error) {
    console.error("Error fetching user activity:", error)
    return NextResponse.json({ error: "Failed to fetch user activity" }, { status: 500 })
  }
}
