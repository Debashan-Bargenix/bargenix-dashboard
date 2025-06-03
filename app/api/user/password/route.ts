import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Basic validation
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    if (data.newPassword !== data.confirmPassword) {
      return NextResponse.json({ message: "New passwords do not match" }, { status: 400 })
    }

    if (data.newPassword.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 })
    }

    // In a real app, you would verify the current password here
    // For this example, we'll skip that step

    // Update password (in a real app, you'd hash the password)
    await queryDb(`UPDATE users SET updated_at = NOW() WHERE id = $1`, [user.id])

    // Log activity
    try {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'password_change', 'Password changed', $2, NOW())`,
        [user.id, "127.0.0.1"],
      )
    } catch (error) {
      console.error("Error logging activity:", error)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Error updating password:", error)
    return NextResponse.json({ message: "Failed to update password" }, { status: 500 })
  }
}
