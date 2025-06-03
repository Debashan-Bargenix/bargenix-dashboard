"use server"
import { cookies } from "next/headers"
import { queryDb, beginTransaction, commitTransaction, rollbackTransaction } from "@/lib/db"
import { getCurrentUser, logoutUser } from "@/lib/auth"
import { z } from "zod"

// Validation schema for deletion confirmation
const deletionSchema = z.object({
  confirmationText: z.string().refine((val) => val === "DELETE", {
    message: "Please type DELETE to confirm",
  }),
  reason: z.string().optional(),
  password: z.string().min(1, "Password is required"),
})

// Function to archive user data before deletion
async function archiveUserData(userId: number, reason: string | null, ipAddress: string) {
  try {
    console.log(`Archiving data for user ID: ${userId}`)

    // Get basic user data
    const userData = await queryDb(`SELECT * FROM users WHERE id = $1`, [userId])
    if (userData.length === 0) {
      throw new Error("User not found")
    }

    const user = userData[0]

    // Get user's current plan
    const planData = await queryDb(
      `
      SELECT mp.name as plan_name, mp.slug as plan_slug, um.status
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1
      ORDER BY um.created_at DESC
      LIMIT 1
    `,
      [userId],
    )

    // Get user's shopify connection
    const shopifyData = await queryDb(
      `
      SELECT * FROM shopify_connections 
      WHERE user_id = $1
      LIMIT 1
    `,
      [userId],
    )

    // Get user preferences
    const preferencesData = await queryDb(
      `
      SELECT * FROM user_preferences 
      WHERE user_id = $1
      LIMIT 1
    `,
      [userId],
    )

    // Get user notifications
    const notificationsData = await queryDb(
      `
      SELECT * FROM user_notifications 
      WHERE user_id = $1
      LIMIT 1
    `,
      [userId],
    )

    // Get product statistics
    const productStats = await queryDb(
      `
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN inventory_count > 0 THEN 1 ELSE 0 END) as in_stock_products
      FROM products
      WHERE user_id = $1
    `,
      [userId],
    )

    // Get bargaining statistics
    const bargainingStats = await queryDb(
      `
      SELECT 
        COUNT(*) as total_settings,
        SUM(CASE WHEN is_enabled = true THEN 1 ELSE 0 END) as enabled_count
      FROM bargaining_settings
      WHERE user_id = $1
    `,
      [userId],
    )

    // Prepare complete data backup as JSON
    const completeBackup = {
      user: user,
      plan: planData.length > 0 ? planData[0] : null,
      shopify: shopifyData.length > 0 ? shopifyData[0] : null,
      preferences: preferencesData.length > 0 ? preferencesData[0] : null,
      notifications: notificationsData.length > 0 ? notificationsData[0] : null,
      productStats: productStats.length > 0 ? productStats[0] : null,
      bargainingStats: bargainingStats.length > 0 ? bargainingStats[0] : null,
    }

    // Insert into archive table
    await queryDb(
      `
      INSERT INTO deleted_users_archive (
        original_user_id, 
        first_name, 
        last_name, 
        email, 
        company_name, 
        phone, 
        deletion_date,
        deletion_reason,
        deletion_ip,
        registration_date,
        last_login_date,
        plan_at_deletion,
        subscription_status,
        total_products,
        bargaining_enabled_count,
        had_shopify_connection,
        store_url,
        user_preferences,
        user_notifications,
        complete_data_backup
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
    `,
      [
        userId,
        user.first_name,
        user.last_name,
        user.email,
        user.company_name,
        user.phone,
        reason,
        ipAddress,
        user.created_at,
        user.last_login_at,
        planData.length > 0 ? planData[0].plan_name : null,
        planData.length > 0 ? planData[0].status : null,
        productStats.length > 0 ? productStats[0].total_products : 0,
        bargainingStats.length > 0 ? bargainingStats[0].enabled_count : 0,
        shopifyData.length > 0,
        shopifyData.length > 0 ? shopifyData[0].shop_url : null,
        preferencesData.length > 0 ? JSON.stringify(preferencesData[0]) : null,
        notificationsData.length > 0 ? JSON.stringify(notificationsData[0]) : null,
        JSON.stringify(completeBackup),
      ],
    )

    // Log the deletion
    await queryDb(
      `
      INSERT INTO account_deletion_logs (
        original_user_id,
        email,
        deletion_date,
        deletion_reason,
        deletion_ip,
        deletion_status
      ) VALUES ($1, $2, NOW(), $3, $4, 'completed')
    `,
      [userId, user.email, reason, ipAddress],
    )

    console.log(`Successfully archived data for user ID: ${userId}`)
    return true
  } catch (error) {
    console.error("Error archiving user data:", error)

    // Log the error
    try {
      const user = await queryDb(`SELECT email FROM users WHERE id = $1`, [userId])
      const email = user.length > 0 ? user[0].email : "unknown"

      await queryDb(
        `
        INSERT INTO account_deletion_logs (
          original_user_id,
          email,
          deletion_date,
          deletion_reason,
          deletion_ip,
          deletion_status,
          error_message
        ) VALUES ($1, $2, NOW(), $3, $4, 'failed', $5)
      `,
        [userId, email, reason, ipAddress, error.message],
      )
    } catch (logError) {
      console.error("Error logging deletion failure:", logError)
    }

    throw error
  }
}

// Function to delete all user data
async function deleteAllUserData(userId: number) {
  try {
    console.log(`Deleting all data for user ID: ${userId}`)

    // List of tables with user_id foreign key
    // The order matters for foreign key constraints
    const tables = [
      "bargaining_settings",
      "product_sync_history",
      "products",
      "user_activity",
      "user_notifications",
      "user_preferences",
      "shopify_connections",
      "user_memberships",
      "sessions",
      // users table will be deleted last
    ]

    // Delete data from each table
    for (const table of tables) {
      await queryDb(`DELETE FROM ${table} WHERE user_id = $1`, [userId])
      console.log(`Deleted data from ${table} for user ID: ${userId}`)
    }

    // Finally delete the user
    await queryDb(`DELETE FROM users WHERE id = $1`, [userId])
    console.log(`Deleted user with ID: ${userId}`)

    return true
  } catch (error) {
    console.error("Error deleting user data:", error)
    throw error
  }
}

// Main function to handle account deletion
export async function deleteAccount(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: "You must be logged in to delete your account" }
  }

  const userId = user.id

  // Parse form data
  const rawData = {
    confirmationText: formData.get("confirmationText") as string,
    reason: formData.get("reason") as string,
    password: formData.get("password") as string,
  }

  // Validate the data
  const validationResult = deletionSchema.safeParse(rawData)
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid form data",
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  const data = validationResult.data

  // In a real app, you would verify the password here
  // For this example, we'll skip that step

  try {
    // Start a transaction
    await beginTransaction()

    // Archive user data first
    await archiveUserData(userId, data.reason || null, "127.0.0.1")

    // Delete all user data
    await deleteAllUserData(userId)

    // Commit the transaction
    await commitTransaction()

    // Log the user out
    await logoutUser()

    // Clear cookies
    cookies().delete("session_token")

    return { success: true, message: "Your account has been successfully deleted" }
  } catch (error) {
    // Rollback the transaction on error
    await rollbackTransaction()

    console.error("Error deleting account:", error)
    return {
      success: false,
      message: "Failed to delete account. Please try again or contact support.",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
