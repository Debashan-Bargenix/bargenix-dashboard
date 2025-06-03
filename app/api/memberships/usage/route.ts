import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Define types for better type safety
interface TableExistsResult {
  um_exists: boolean
  mp_exists: boolean
  pbs_exists: boolean
  br_exists: boolean
}

interface MembershipResult {
  id: number
  status: string
  next_billing_date: string | null
  plan_name: string
  products_limit: number | string
  monthly_requests: number | string
  price: number
}

interface UsageResponse {
  data: {
    productsUsed: number
    productsLimit: number
    requestsUsed: number
    requestsLimit: number
    planName: string
    status: string
    nextBillingDate?: string
    price: number
  }
  message?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<UsageResponse | { error: string }>> {
  console.log(`[API /api/memberships/usage] Received request: ${request.url}`)
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      console.error("[API /api/memberships/usage] Unauthorized: No current user session.")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get("userId")
    const resolvedUserId = userIdParam || user.id.toString()

    console.log(
      `[API /api/memberships/usage] Authenticated user ID: ${user.id}, Role: ${user.role}. Requested userId param: ${userIdParam}. Resolved userId for query: ${resolvedUserId}`,
    )

    // Verify user has permission to access this data
    if (user.id.toString() !== resolvedUserId && user.role !== "admin") {
      console.warn(
        `[API /api/memberships/usage] Forbidden: User ${user.id} attempting to access data for ${resolvedUserId}.`,
      )
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if required tables exist
    const tablesCheck = await queryDb<TableExistsResult>(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_memberships') as um_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'membership_plans') as mp_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_bargaining_settings') as pbs_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bargain_requests') as br_exists
    `)

    if (!tablesCheck || !tablesCheck.length) {
      console.error("[API /api/memberships/usage] Failed to check table existence. Using default plan limits.")
      return NextResponse.json(
        {
          data: {
            productsUsed: 0,
            productsLimit: 10,
            requestsUsed: 0,
            requestsLimit: 100,
            planName: "Free",
            status: "active",
            price: 0,
          },
          message: "Using default plan limits (table check failed)",
        },
        { status: 200 },
      )
    }

    const tableExists = tablesCheck[0]
    console.log("[API /api/memberships/usage] Table existence check:", tableExists)

    // Default membership values
    let membership: Partial<MembershipResult> = {
      plan_name: "Free",
      products_limit: 10,
      monthly_requests: 100,
      status: "active",
      price: 0,
    }

    // Get user's current membership if tables exist
    if (tableExists.um_exists && tableExists.mp_exists) {
      try {
        const membershipResult = await queryDb<MembershipResult>(
          `
          SELECT 
            um.id,
            um.status,
            um.next_billing_date,
            mp.name as plan_name,
            mp.max_products as products_limit,
            mp.monthly_requests as monthly_requests,
            mp.price
          FROM user_memberships um
          JOIN membership_plans mp ON um.plan_id = mp.id
          WHERE um.user_id = $1 AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `,
          [resolvedUserId],
        )

        if (membershipResult && membershipResult.length > 0) {
          membership = membershipResult[0]
          console.log(`[API /api/memberships/usage] Fetched membership for userId ${resolvedUserId}:`, membership)
        } else {
          console.log(
            `[API /api/memberships/usage] No active membership found for userId ${resolvedUserId}. Using defaults.`,
          )
        }
      } catch (error) {
        console.error(
          `[API /api/memberships/usage] Error fetching membership data for userId ${resolvedUserId}:`,
          error,
        )
      }
    }

    // Get products with bargaining enabled
    let productsUsed = 0
    if (tableExists.pbs_exists) {
      const productQuery = `
        SELECT COUNT(DISTINCT product_id) as count 
        FROM product_bargaining_settings 
        WHERE user_id = $1 AND bargaining_enabled = true
      `
      console.log(
        `[API /api/memberships/usage] Querying product_bargaining_settings for userId: ${resolvedUserId} (type: ${typeof resolvedUserId}) with query: ${productQuery.replace("$1", resolvedUserId)}`,
      )
      try {
        // Ensure resolvedUserId is passed as the correct type if your db library is strict
        // For Neon serverless, it typically handles string/number conversion for integer columns well.
        const productsResult = await queryDb<{ count: string | number }>(productQuery, [
          // Try casting to number if user_id in DB is integer
          Number.isInteger(Number(resolvedUserId)) ? Number(resolvedUserId) : resolvedUserId,
        ])

        console.log(
          `[API /api/memberships/usage] Raw productsResult for userId ${resolvedUserId}:`,
          JSON.stringify(productsResult),
        )

        if (productsResult && productsResult.length > 0 && productsResult[0].count !== undefined) {
          productsUsed = Number(productsResult[0].count)
        }
        console.log(
          `[API /api/memberships/usage] Calculated productsUsed: ${productsUsed} for userId ${resolvedUserId}`,
        )
      } catch (error) {
        console.error(`[API /api/memberships/usage] Error fetching product usage for userId ${resolvedUserId}:`, error)
      }
    } else {
      console.log(
        "[API /api/memberships/usage] product_bargaining_settings table does not exist. productsUsed set to 0.",
      )
    }

    // Get bargain requests this month
    let requestsUsed = 0
    if (tableExists.br_exists) {
      try {
        const requestsResult = await queryDb<{ count: string | number }>(
          `
          SELECT COUNT(*) as count 
          FROM bargain_requests 
          WHERE user_id = $1 
          AND created_at >= date_trunc('month', CURRENT_DATE)
        `,
          [resolvedUserId],
        )

        if (requestsResult && requestsResult.length > 0 && requestsResult[0].count !== undefined) {
          requestsUsed = Number(requestsResult[0].count)
        }
      } catch (error) {
        console.error(
          `[API /api/memberships/usage] Error fetching bargain requests for userId ${resolvedUserId}:`,
          error,
        )
      }
    }

    // Ensure numeric values
    const productsLimit = Number(membership.products_limit || 10)
    const requestsLimit = Number(membership.monthly_requests || 100)
    const price = Number(membership.price || 0)

    const responseData = {
      data: {
        productsUsed,
        productsLimit,
        requestsUsed,
        requestsLimit,
        planName: membership.plan_name || "Free",
        status: membership.status || "active",
        nextBillingDate: membership.next_billing_date || undefined,
        price,
      },
    }
    console.log(`[API /api/memberships/usage] Sending response for userId ${resolvedUserId}:`, responseData)
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("[API /api/memberships/usage] Unhandled error in GET request:", error)
    return NextResponse.json(
      {
        error: `Failed to fetch membership usage: ${error.message || "Unknown error"}`,
      },
      { status: 500 }, // Changed to 500 for unhandled server errors
    )
  }
}
