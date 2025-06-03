import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserMembership, getUserProductUsage } from "@/app/actions/membership-actions"

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's membership and usage
    const membership = await getUserMembership(user.id)
    const productUsage = await getUserProductUsage(user.id)

    return NextResponse.json({
      membership,
      productUsage,
    })
  } catch (error) {
    console.error("Error fetching current membership:", error)
    return NextResponse.json({ error: "Failed to fetch membership data" }, { status: 500 })
  }
}
