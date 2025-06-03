import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

interface BillingEvent {
  id: number
  user_id: number
  event_type: string
  amount: number
  description: string
  status: string
  shopify_charge_id: string | null
  event_date: string
  metadata: any
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || user.id.toString()

    // Verify user has permission to access this data
    if (user.id.toString() !== userId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if billing_events table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'billing_events'
      ) as exists
    `)

    if (!tableCheck || !tableCheck.length || !tableCheck[0].exists) {
      // Table doesn't exist, return empty data
      return NextResponse.json({
        data: [],
        message: "No billing history available",
      })
    }

    // Get billing history
    const billingEvents = await queryDb<BillingEvent>(
      `
      SELECT 
        id,
        user_id,
        event_type,
        amount,
        description,
        status,
        shopify_charge_id,
        event_date,
        metadata,
        created_at
      FROM billing_events
      WHERE user_id = $1
      ORDER BY event_date DESC
      LIMIT 10
    `,
      [userId],
    )

    // Transform data for the frontend
    const billingHistory = billingEvents.map((event) => ({
      id: event.id,
      date: event.event_date,
      type: event.event_type,
      amount: event.amount,
      description: event.description,
      status: event.status,
      chargeId: event.shopify_charge_id,
    }))

    return NextResponse.json({
      data: billingHistory,
    })
  } catch (error) {
    console.error("Error fetching billing history:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch billing history",
        data: [],
      },
      { status: 200 },
    )
  }
}
