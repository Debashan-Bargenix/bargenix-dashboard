import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      company_name: user.company_name,
      phone: user.phone,
      bio: user.bio,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ message: "Failed to fetch user profile" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Basic validation
    if (!data.firstName || !data.lastName || !data.email) {
      return NextResponse.json({ message: "First name, last name, and email are required" }, { status: 400 })
    }

    // Check if email is already in use by another user
    if (data.email !== user.email) {
      const existingUser = await queryDb(`SELECT id FROM users WHERE email = $1 AND id != $2`, [data.email, user.id])
      if (existingUser.length > 0) {
        return NextResponse.json({ message: "Email is already in use" }, { status: 400 })
      }
    }

    // Update user profile
    const result = await queryDb(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, company_name = $4, phone = $5, bio = $6, updated_at = NOW() 
       WHERE id = $7
       RETURNING id, first_name, last_name, email, company_name, phone, bio`,
      [
        data.firstName,
        data.lastName,
        data.email,
        data.companyName || null,
        data.phone || null,
        data.bio || null,
        user.id,
      ],
    )

    if (!result || result.length === 0) {
      return NextResponse.json({ message: "Failed to update profile" }, { status: 500 })
    }

    // Log activity
    try {
      await queryDb(
        `INSERT INTO user_activity (user_id, activity_type, details, ip_address, created_at)
         VALUES ($1, 'profile_update', 'Profile information updated', $2, NOW())`,
        [user.id, "127.0.0.1"],
      )
    } catch (error) {
      console.error("Error logging activity:", error)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: result[0],
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 })
  }
}
