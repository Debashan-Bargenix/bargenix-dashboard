import { queryDb } from "./db"

// Interface for membership status
interface MembershipStatus {
  id: number
  user_id: number
  plan_id: number
  status: string
  shopify_charge_id: string | null
}

// Fix inconsistent membership statuses
export async function fixMembershipStatuses(): Promise<{
  success: boolean
  message: string
  fixedUsers: number[]
}> {
  try {
    const fixedUsers: number[] = []

    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Find users with multiple active memberships
      const usersWithMultipleActive = await queryDb(`
        SELECT user_id, COUNT(*) as active_count
        FROM user_memberships
        WHERE status = 'active'
        GROUP BY user_id
        HAVING COUNT(*) > 1
      `)

      // Fix each user with multiple active memberships
      for (const user of usersWithMultipleActive) {
        const userId = user.user_id

        // Get all active memberships for this user
        const memberships = await queryDb(
          `
          SELECT id, plan_id, status, shopify_charge_id, updated_at
          FROM user_memberships
          WHERE user_id = $1 AND status = 'active'
          ORDER BY updated_at DESC
        `,
          [userId],
        )

        if (memberships.length <= 1) continue

        // Keep the most recently updated one active
        const keepActiveId = memberships[0].id

        // Cancel all others
        await queryDb(
          `
          UPDATE user_memberships
          SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
          WHERE user_id = $1 AND status = 'active' AND id != $2
        `,
          [userId, keepActiveId],
        )

        // Log this change
        await queryDb(
          `
          INSERT INTO billing_events (
            user_id, 
            event_type, 
            plan_id, 
            status, 
            details
          )
          VALUES (
            $1, 
            'membership_status_fixed', 
            $2, 
            'active', 
            $3
          )
        `,
          [
            userId,
            memberships[0].plan_id,
            JSON.stringify({
              reason: "System maintenance - fixed multiple active memberships",
              fixed_at: new Date().toISOString(),
              cancelled_memberships: memberships.slice(1).map((m) => m.id),
            }),
          ],
        )

        fixedUsers.push(userId)
      }

      // Find users with pending memberships that should be cancelled
      const usersWithStuckPending = await queryDb(`
        SELECT user_id, id, plan_id, updated_at
        FROM user_memberships
        WHERE status = 'pending'
        AND updated_at < NOW() - INTERVAL '24 hours'
      `)

      // Cancel stuck pending memberships
      for (const membership of usersWithStuckPending) {
        await queryDb(
          `
          UPDATE user_memberships
          SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
          WHERE id = $1
        `,
          [membership.id],
        )

        // Log this change
        await queryDb(
          `
          INSERT INTO billing_events (
            user_id, 
            event_type, 
            plan_id, 
            status, 
            details
          )
          VALUES (
            $1, 
            'pending_membership_cancelled', 
            $2, 
            'cancelled', 
            $3
          )
        `,
          [
            membership.user_id,
            membership.plan_id,
            JSON.stringify({
              reason: "System maintenance - cancelled stuck pending membership",
              cancelled_at: new Date().toISOString(),
              pending_since: membership.updated_at,
            }),
          ],
        )

        if (!fixedUsers.includes(membership.user_id)) {
          fixedUsers.push(membership.user_id)
        }
      }

      // Commit transaction
      await queryDb("COMMIT")

      return {
        success: true,
        message: `Fixed membership statuses for ${fixedUsers.length} users`,
        fixedUsers,
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error fixing membership statuses:", error)
    return {
      success: false,
      message: `Error fixing membership statuses: ${error instanceof Error ? error.message : String(error)}`,
      fixedUsers: [],
    }
  }
}

// Ensure user has exactly one active membership
export async function ensureUserHasActiveMembership(userId: number): Promise<{
  success: boolean
  message: string
  activeMembershipId: number | null
}> {
  try {
    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Get all memberships for this user
      const memberships = await queryDb(
        `
        SELECT id, plan_id, status, shopify_charge_id, updated_at
        FROM user_memberships
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `,
        [userId],
      )

      // Count active memberships
      const activeMemberships = memberships.filter((m) => m.status === "active")

      if (activeMemberships.length === 1) {
        // User already has exactly one active membership
        await queryDb("COMMIT")
        return {
          success: true,
          message: "User already has exactly one active membership",
          activeMembershipId: activeMemberships[0].id,
        }
      }

      if (activeMemberships.length > 1) {
        // Cancel all but the most recent active membership
        const keepActiveId = activeMemberships[0].id

        await queryDb(
          `
          UPDATE user_memberships
          SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
          WHERE user_id = $1 AND status = 'active' AND id != $2
        `,
          [userId, keepActiveId],
        )

        // Log this change
        await queryDb(
          `
          INSERT INTO billing_events (
            user_id, 
            event_type, 
            plan_id, 
            status, 
            details
          )
          VALUES (
            $1, 
            'membership_status_fixed', 
            $2, 
            'active', 
            $3
          )
        `,
          [
            userId,
            activeMemberships[0].plan_id,
            JSON.stringify({
              reason: "System maintenance - fixed multiple active memberships",
              fixed_at: new Date().toISOString(),
              cancelled_memberships: activeMemberships.slice(1).map((m) => m.id),
            }),
          ],
        )

        await queryDb("COMMIT")
        return {
          success: true,
          message: "Fixed multiple active memberships",
          activeMembershipId: keepActiveId,
        }
      }

      // No active memberships, activate the most recent one or create a free plan
      if (memberships.length > 0) {
        // Get the most recent membership
        const mostRecentId = memberships[0].id

        await queryDb(
          `
          UPDATE user_memberships
          SET status = 'active', updated_at = NOW()
          WHERE id = $1
        `,
          [mostRecentId],
        )

        // Log this change
        await queryDb(
          `
          INSERT INTO billing_events (
            user_id, 
            event_type, 
            plan_id, 
            status, 
            details
          )
          VALUES (
            $1, 
            'membership_activated', 
            $2, 
            'active', 
            $3
          )
        `,
          [
            userId,
            memberships[0].plan_id,
            JSON.stringify({
              reason: "System maintenance - activated membership",
              activated_at: new Date().toISOString(),
              previous_status: memberships[0].status,
            }),
          ],
        )

        await queryDb("COMMIT")
        return {
          success: true,
          message: "Activated most recent membership",
          activeMembershipId: mostRecentId,
        }
      } else {
        // No memberships at all, create a free plan
        // Get free plan ID
        const freePlanResult = await queryDb(`
          SELECT id FROM membership_plans WHERE slug = 'free' LIMIT 1
        `)

        if (freePlanResult.length === 0) {
          throw new Error("Free plan not found")
        }

        const freePlanId = freePlanResult[0].id

        // Create new membership with free plan
        const newMembershipResult = await queryDb(
          `
          INSERT INTO user_memberships (user_id, plan_id, status, start_date)
          VALUES ($1, $2, 'active', NOW())
          RETURNING id
        `,
          [userId, freePlanId],
        )

        // Update user's current plan
        await queryDb(
          `
          UPDATE users
          SET current_plan_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
          [freePlanId, userId],
        )

        // Log this change
        await queryDb(
          `
          INSERT INTO billing_events (
            user_id, 
            event_type, 
            plan_id, 
            status, 
            details
          )
          VALUES (
            $1, 
            'membership_created', 
            $2, 
            'active', 
            $3
          )
        `,
          [
            userId,
            freePlanId,
            JSON.stringify({
              reason: "System maintenance - created free plan membership",
              created_at: new Date().toISOString(),
            }),
          ],
        )

        await queryDb("COMMIT")
        return {
          success: true,
          message: "Created new free plan membership",
          activeMembershipId: newMembershipResult[0].id,
        }
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error ensuring user has active membership:", error)
    return {
      success: false,
      message: `Error ensuring user has active membership: ${error instanceof Error ? error.message : String(error)}`,
      activeMembershipId: null,
    }
  }
}
