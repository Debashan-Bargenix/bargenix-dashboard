import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, RefreshCw } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { queryDb } from "@/lib/db"

interface MembershipWidgetProps {
  membership: any
  userId: string
}

export async function MembershipWidget({ membership, userId }: MembershipWidgetProps) {
  // Fetch membership data directly from the database
  const membershipData = await getMembershipData(userId)

  if (!membershipData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Membership Status</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-muted-foreground">No membership data available</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/dashboard/memberships">View Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { planName, productLimit, productsUsed, daysRemaining, isActive } = membershipData

  // Calculate usage percentage
  const usagePercent = productLimit > 0 ? Math.min(100, (productsUsed / productLimit) * 100) : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Membership Status</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold">{planName}</p>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Product Usage</span>
            <span>
              {productsUsed} / {productLimit}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {usagePercent >= 80
              ? "Approaching limit. Consider upgrading."
              : `${Math.round(usagePercent)}% of product limit used`}
          </p>
        </div>

        <div className="mt-4 text-sm">
          <p>{daysRemaining > 0 ? `${daysRemaining} days remaining` : "Subscription expired"}</p>
        </div>

        <div className="mt-4 flex justify-between">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/memberships">Manage Plan</Link>
          </Button>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

async function getMembershipData(userId: string) {
  try {
    // Check if the tables exist
    const tablesCheck = await queryDb(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_memberships') as um_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'membership_plans') as mp_exists
    `)

    if (!tablesCheck[0].um_exists || !tablesCheck[0].mp_exists) {
      console.log("Membership tables don't exist yet")
      return {
        planName: "Free Plan",
        productLimit: 10,
        productsUsed: 0,
        daysRemaining: 30,
        isActive: true,
      }
    }

    // Query membership data
    const membershipQuery = await queryDb(
      `
      SELECT 
        mp.name as plan_name,
        mp.product_limit,
        um.start_date,
        um.end_date,
        um.status
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1
      ORDER BY um.created_at DESC
      LIMIT 1
    `,
      [userId],
    )

    if (!membershipQuery || membershipQuery.length === 0) {
      return {
        planName: "Free Plan",
        productLimit: 10,
        productsUsed: 0,
        daysRemaining: 30,
        isActive: true,
      }
    }

    const membership = membershipQuery[0]

    // Get products used
    const productsQuery = await queryDb(
      `
      SELECT COUNT(*) as count
      FROM shopify_products
      WHERE user_id = $1 AND bargaining_enabled = true
    `,
      [userId],
    )

    const productsUsed = Number.parseInt(productsQuery[0]?.count || "0")

    // Calculate days remaining
    const endDate = membership.end_date ? new Date(membership.end_date) : null
    const now = new Date()
    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      planName: membership.plan_name || "Free Plan",
      productLimit: Number.parseInt(membership.product_limit || "10"),
      productsUsed,
      daysRemaining,
      isActive: membership.status === "active",
    }
  } catch (error) {
    console.error("Error fetching membership data:", error)
    return {
      planName: "Free Plan",
      productLimit: 10,
      productsUsed: 0,
      daysRemaining: 30,
      isActive: true,
    }
  }
}
