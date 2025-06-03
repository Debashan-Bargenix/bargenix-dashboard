import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // In a real app, you would verify the password here
    // For this example, we'll skip that step

    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Archive user data before deletion
      await archiveUserData(user.id)

      // Delete user data from all related tables
      await deleteUserData(user.id)

      // Commit transaction
      await queryDb("COMMIT")

      // Clear cookies
      cookies().delete("auth_token")

      return NextResponse.json({
        success: true,
        message: "Account deleted successfully",
      })
    } catch (error) {
      // Rollback transaction on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ message: "Failed to delete account" }, { status: 500 })
  }
}

async function archiveUserData(userId: number) {
  // Check if deleted_users_archive table exists
  const tableExists = await queryDb(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'deleted_users_archive'
    );
  `)

  if (!tableExists[0].exists) {
    // Create the table if it doesn't exist
    await queryDb(`
      CREATE TABLE deleted_users_archive (
        id SERIAL PRIMARY KEY,
        original_user_id INTEGER NOT NULL,
        email VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        user_data JSONB,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
  }

  // Get user data
  const userData = await queryDb("SELECT * FROM users WHERE id = $1", [userId])

  if (userData.length === 0) {
    throw new Error("User not found")
  }

  // Get related data
  const notifications = await queryDb("SELECT * FROM user_notifications WHERE user_id = $1", [userId]).catch(() => [])
  const preferences = await queryDb("SELECT * FROM user_preferences WHERE user_id = $1", [userId]).catch(() => [])
  const activity = await queryDb("SELECT * FROM user_activity WHERE user_id = $1", [userId]).catch(() => [])

  // Create a complete user data object
  const completeUserData = {
    user: userData[0],
    notifications: notifications[0] || null,
    preferences: preferences[0] || null,
    activity: activity || [],
  }

  // Archive user data
  await queryDb(
    `INSERT INTO deleted_users_archive (original_user_id, email, first_name, last_name, user_data, deleted_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, userData[0].email, userData[0].first_name, userData[0].last_name, JSON.stringify(completeUserData)],
  )
}

async function deleteUserData(userId: number) {
  // Delete data from all related tables
  // Order matters due to foreign key constraints

  // Delete activity logs
  await queryDb("DELETE FROM user_activity WHERE user_id = $1", [userId]).catch(() => {})

  // Delete notification preferences
  await queryDb("DELETE FROM user_notifications WHERE user_id = $1", [userId]).catch(() => {})

  // Delete user preferences
  await queryDb("DELETE FROM user_preferences WHERE user_id = $1", [userId]).catch(() => {})

  // Delete user
  await queryDb("DELETE FROM users WHERE id = $1", [userId])
}
