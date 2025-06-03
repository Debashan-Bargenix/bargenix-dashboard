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

    // Check if user_notifications table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notifications'
      );
    `)

    if (!tableExists[0].exists) {
      // Return default values if table doesn't exist
      return NextResponse.json({
        email_notifications: true,
        marketing_emails: false,
        security_alerts: true,
        product_updates: true,
        account_activity: true,
      })
    }

    // Get user notifications
    const result = await queryDb(`SELECT * FROM user_notifications WHERE user_id = $1`, [userId])

    if (result.length === 0) {
      // Return default values if no preferences are set
      return NextResponse.json({
        email_notifications: true,
        marketing_emails: false,
        security_alerts: true,
        product_updates: true,
        account_activity: true,
      })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ message: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Check if user_notifications table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notifications'
      );
    `)

    if (!tableExists[0].exists) {
      // Create the table if it doesn't exist
      await queryDb(`
        CREATE TABLE user_notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email_notifications BOOLEAN DEFAULT TRUE,
          marketing_emails BOOLEAN DEFAULT FALSE,
          security_alerts BOOLEAN DEFAULT TRUE,
          product_updates BOOLEAN DEFAULT TRUE,
          account_activity BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `)
    }

    // Update or insert notification preferences
    await queryDb(
      `INSERT INTO user_notifications 
       (user_id, email_notifications, marketing_emails, security_alerts, product_updates, account_activity, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET
         email_notifications = $2,
         marketing_emails = $3,
         security_alerts = $4,
         product_updates = $5,
         account_activity = $6,
         updated_at = NOW()`,
      [
        user.id,
        data.emailNotifications,
        data.marketingEmails,
        data.securityAlerts,
        data.productUpdates,
        data.accountActivity,
      ],
    )

    // Log activity
    try {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'settings_change', 'Notification preferences updated', $2, NOW())`,
        [user.id, "127.0.0.1"],
      )
    } catch (error) {
      console.error("Error logging activity:", error)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully",
    })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json({ message: "Failed to update notifications" }, { status: 500 })
  }
}
