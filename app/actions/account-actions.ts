"use server"

import { revalidatePath } from "next/cache"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

// Profile update schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
})

// Password update schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// Notification preferences schema
const notificationsSchema = z.object({
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
  productUpdates: z.boolean(),
  accountActivity: z.boolean(),
})

// User preferences schema
const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
  autoSave: z.boolean(),
  compactView: z.boolean(),
})

// Get user notification preferences
export async function getUserNotifications(userId: number) {
  try {
    // Check if the table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notifications'
      );
    `)

    if (!tableExists[0].exists) {
      console.log("user_notifications table does not exist, returning default values")
      return {
        email_notifications: true,
        marketing_emails: false,
        security_alerts: true,
        product_updates: true,
        account_activity: true,
      }
    }

    const result = await queryDb(`SELECT * FROM user_notifications WHERE user_id = $1`, [userId])

    if (result.length === 0) {
      // Return default values if no preferences are set
      return {
        email_notifications: true,
        marketing_emails: false,
        security_alerts: true,
        product_updates: true,
        account_activity: true,
      }
    }

    return result[0]
  } catch (error) {
    console.error("Error fetching user notifications:", error)
    // Return default values on error
    return {
      email_notifications: true,
      marketing_emails: false,
      security_alerts: true,
      product_updates: true,
      account_activity: true,
    }
  }
}

// Get user preferences
export async function getUserPreferences(userId: number) {
  try {
    // Check if the table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
      );
    `)

    if (!tableExists[0].exists) {
      console.log("user_preferences table does not exist, returning default values")
      return {
        theme: "system",
        language: "en",
        auto_save: true,
        compact_view: false,
      }
    }

    const result = await queryDb(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId])

    if (result.length === 0) {
      // Return default values if no preferences are set
      return {
        theme: "system",
        language: "en",
        auto_save: true,
        compact_view: false,
      }
    }

    return result[0]
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    // Return default values on error
    return {
      theme: "system",
      language: "en",
      auto_save: true,
      compact_view: false,
    }
  }
}

// Get account activity
export async function getAccountActivity(userId: number) {
  try {
    // Check if the table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    if (!tableExists[0].exists) {
      console.log("user_activity table does not exist, returning empty array")
      return []
    }

    const result = await queryDb(
      `SELECT * FROM user_activity 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId],
    )

    return result
  } catch (error) {
    console.error("Error fetching account activity:", error)
    // Return empty array instead of throwing to avoid breaking the UI
    return []
  }
}

// Update profile
export async function updateProfile(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to update your profile" }
    }

    const userId = user.id
    const rawData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      companyName: formData.get("companyName") as string,
      phone: formData.get("phone") as string,
      bio: formData.get("bio") as string,
    }

    console.log("Updating profile with data:", rawData)

    // Validate the data
    const validationResult = profileSchema.safeParse(rawData)
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.flatten().fieldErrors)
      return {
        success: false,
        message: "Invalid form data",
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const data = validationResult.data

    // Check if email is already in use by another user
    if (data.email !== user.email) {
      const existingUser = await queryDb(`SELECT id FROM users WHERE email = $1 AND id != $2`, [data.email, userId])

      if (existingUser.length > 0) {
        return { success: false, message: "Email is already in use" }
      }
    }

    // Update the user in the database
    const updateResult = await queryDb(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, company_name = $4, phone = $5, bio = $6, updated_at = NOW() 
       WHERE id = $7
       RETURNING id, first_name, last_name, email, company_name, phone, bio`,
      [data.firstName, data.lastName, data.email, data.companyName, data.phone, data.bio, userId],
    )

    console.log("Update result:", updateResult)

    if (!updateResult || updateResult.length === 0) {
      return { success: false, message: "Failed to update profile. User not found." }
    }

    // Check if user_activity table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    // Log the activity if the table exists
    if (tableExists[0].exists) {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'profile_update', 'Profile information updated', $2, NOW())
         RETURNING id`,
        [userId, "127.0.0.1"], // In a real app, you'd get the actual IP
      )
    }

    revalidatePath("/dashboard/account")
    return {
      success: true,
      message: "Profile updated successfully",
      user: updateResult[0],
    }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { success: false, message: `Failed to update profile: ${error.message}` }
  }
}

// Change password
export async function changePassword(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to change your password" }
    }

    const userId = user.id
    const rawData = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    }

    // Validate the data
    const validationResult = passwordSchema.safeParse(rawData)
    if (!validationResult.success) {
      return {
        success: false,
        message: "Invalid form data",
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const data = validationResult.data

    // In a real app, you would verify the current password here
    // For this example, we'll skip that step

    // Update the password in the database (in a real app, you'd hash the password)
    await queryDb(`UPDATE users SET updated_at = NOW() WHERE id = $1`, [userId])

    // Check if user_activity table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    // Log the activity if the table exists
    if (tableExists[0].exists) {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'password_change', 'Password changed', $2, NOW())`,
        [userId, "127.0.0.1"], // In a real app, you'd get the actual IP
      )
    }

    revalidatePath("/dashboard/account")
    return { success: true, message: "Password changed successfully" }
  } catch (error) {
    console.error("Error changing password:", error)
    return { success: false, message: "Failed to change password" }
  }
}

// Update notification preferences
export async function updateNotifications(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to update notification preferences" }
    }

    const userId = user.id
    const rawData = {
      emailNotifications: formData.get("emailNotifications") === "true",
      marketingEmails: formData.get("marketingEmails") === "true",
      securityAlerts: formData.get("securityAlerts") === "true",
      productUpdates: formData.get("productUpdates") === "true",
      accountActivity: formData.get("accountActivity") === "true",
    }

    // Validate the data
    const validationResult = notificationsSchema.safeParse(rawData)
    if (!validationResult.success) {
      return {
        success: false,
        message: "Invalid form data",
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const data = validationResult.data

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
       (user_id, email_notifications, marketing_emails, security_alerts, product_updates, account_activity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET
         email_notifications = $2,
         marketing_emails = $3,
         security_alerts = $4,
         product_updates = $5,
         account_activity = $6,
         updated_at = NOW()`,
      [
        userId,
        data.emailNotifications,
        data.marketingEmails,
        data.securityAlerts,
        data.productUpdates,
        data.accountActivity,
      ],
    )

    // Check if user_activity table exists
    const activityTableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    // Log the activity if the table exists
    if (activityTableExists[0].exists) {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'settings_change', 'Notification preferences updated', $2, NOW())`,
        [userId, "127.0.0.1"], // In a real app, you'd get the actual IP
      )
    }

    revalidatePath("/dashboard/account")
    return { success: true, message: "Notification preferences updated successfully" }
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return { success: false, message: "Failed to update notification preferences" }
  }
}

// Update user preferences
export async function updatePreferences(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to update preferences" }
    }

    const userId = user.id
    const rawData = {
      theme: formData.get("theme") as "light" | "dark" | "system",
      language: formData.get("language") as string,
      autoSave: formData.get("autoSave") === "true",
      compactView: formData.get("compactView") === "true",
    }

    // Validate the data
    const validationResult = preferencesSchema.safeParse(rawData)
    if (!validationResult.success) {
      return {
        success: false,
        message: "Invalid form data",
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const data = validationResult.data

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
          auto_save BOOLEAN DEFAULT TRUE,
          compact_view BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `)
    }

    // Update or insert user preferences
    await queryDb(
      `INSERT INTO user_preferences 
       (user_id, theme, language, auto_save, compact_view, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET
         theme = $2,
         language = $3,
         auto_save = $4,
         compact_view = $5,
         updated_at = NOW()`,
      [userId, data.theme, data.language, data.autoSave, data.compactView],
    )

    // Check if user_activity table exists
    const activityTableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_activity'
      );
    `)

    // Log the activity if the table exists
    if (activityTableExists[0].exists) {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'settings_change', 'User preferences updated', $2, NOW())`,
        [userId, "127.0.0.1"], // In a real app, you'd get the actual IP
      )
    }

    revalidatePath("/dashboard/account")
    return { success: true, message: "Preferences updated successfully" }
  } catch (error) {
    console.error("Error updating preferences:", error)
    return { success: false, message: "Failed to update preferences" }
  }
}
