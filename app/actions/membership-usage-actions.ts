"use server"

import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function getProductUsage() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    const userId = user.id.toString()

    // Check if the table exists
    const tableCheck = await queryDb(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_bargaining_settings'
      ) as exists`,
    )

    if (!tableCheck[0].exists) {
      console.log("Table product_bargaining_settings does not exist")
      return { productsUsed: 0 }
    }

    // Query to count products with bargaining enabled
    const result = await queryDb(
      `SELECT COUNT(DISTINCT shopify_product_id) as count 
   FROM product_bargaining_settings 
   WHERE user_id = $1 AND bargaining_enabled = true`,
      [userId],
    )

    const productsUsed = Number.parseInt(result[0]?.count?.toString() || "0")

    return { productsUsed }
  } catch (error) {
    console.error("Error in getProductUsage:", error)
    return { productsUsed: 0, error: error.message }
  }
}
