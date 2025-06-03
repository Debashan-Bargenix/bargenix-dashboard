"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function uninstallApp(storeId: number, status: string) {
  try {
    // Get current user
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        message: "You must be logged in to uninstall the app",
      }
    }

    // Check if store belongs to user
    const store = await queryDb(`SELECT * FROM shopify_stores WHERE id = $1 AND user_id = $2`, [storeId, user.id])

    if (store.length === 0) {
      return {
        success: false,
        message: "Store not found or you don't have permission to manage it",
      }
    }

    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Record uninstall event
      await queryDb(
        `INSERT INTO shopify_uninstall_events (store_id, reason, status)
        VALUES ($1, $2, $3)`,
        [storeId, `User initiated uninstall via dashboard - ${status}`, status],
      )

      // If the status is "uninstall_completed", update the store status
      if (status === "uninstall_completed") {
        // Update store status
        await queryDb(
          `UPDATE shopify_stores
          SET status = 'uninstalled', last_status_check = NOW(), updated_at = NOW()
          WHERE id = $1`,
          [storeId],
        )

        // Delete auth tokens
        await queryDb(`DELETE FROM shopify_auth_tokens WHERE store_id = $1`, [storeId])
      }

      // Commit transaction
      await queryDb("COMMIT")

      // Revalidate paths
      revalidatePath("/dashboard/shopify")

      return {
        success: true,
        message: status === "uninstall_completed" ? "App uninstalled successfully" : "Uninstall process initiated",
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error during app uninstall process:", error)
    return {
      success: false,
      message: error.message || "An error occurred during the uninstall process",
    }
  }
}

export async function getUninstallHistory(storeId: number) {
  try {
    // Get current user
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        message: "You must be logged in to view uninstall history",
        history: [],
      }
    }

    // Check if store belongs to user
    const store = await queryDb(`SELECT * FROM shopify_stores WHERE id = $1 AND user_id = $2`, [storeId, user.id])

    if (store.length === 0) {
      return {
        success: false,
        message: "Store not found or you don't have permission to view its history",
        history: [],
      }
    }

    // Get uninstall history
    const history = await queryDb(
      `SELECT * FROM shopify_uninstall_events 
       WHERE store_id = $1 
       ORDER BY created_at DESC`,
      [storeId],
    )

    return {
      success: true,
      history,
    }
  } catch (error: any) {
    console.error("Error fetching uninstall history:", error)
    return {
      success: false,
      message: error.message || "An error occurred while fetching uninstall history",
      history: [],
    }
  }
}
