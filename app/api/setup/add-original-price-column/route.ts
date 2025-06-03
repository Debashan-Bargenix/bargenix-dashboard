import { queryDb } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if the column already exists
    const columnCheck = await queryDb(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_bargaining_settings' 
      AND column_name = 'original_price'
    `)

    if (columnCheck.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Column 'original_price' already exists in product_bargaining_settings table",
      })
    }

    // Add the column if it doesn't exist
    await queryDb(`
      ALTER TABLE product_bargaining_settings 
      ADD COLUMN original_price DECIMAL(10, 2)
    `)

    return NextResponse.json({
      success: true,
      message: "Added 'original_price' column to product_bargaining_settings table",
    })
  } catch (error) {
    console.error("Error adding original_price column:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add original_price column",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
