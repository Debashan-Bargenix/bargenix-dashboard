"use server"

import { revalidatePath } from "next/cache"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logBillingEvent, generateBillingSessionId } from "@/lib/billing-logger"

// Fetch all membership plans
export async function getMembershipPlans() {
  try {
    const plans = await queryDb(`
      SELECT * FROM membership_plans
      ORDER BY price ASC
    `)
    return plans
  } catch (error) {
    console.error("Error fetching plans:", error)
    return []
  }
}

// Fetch current user membership
export async function getUserMembership(userId: number) {
  try {
    const memberships = await queryDb(
      `
      SELECT 
        um.*, 
        mp.*,
        um.id as membership_id
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1 AND um.status = 'active'
      LIMIT 1
    `,
      [userId],
    )

    return memberships.length > 0 ? memberships[0] : null
  } catch (error) {
    console.error("Error fetching user membership:", error)
    return null
  }
}

// Get user's product usage
export async function getUserProductUsage(userId: number) {
  try {
    // Query the actual product usage from the database
    const result = await queryDb(
      `
      SELECT COUNT(*) as count
      FROM shopify_products
      WHERE user_id = $1 AND bargaining_enabled = true
    `,
      [userId],
    )

    return {
      productsUsed: Number.parseInt(result[0]?.count || "0"),
    }
  } catch (error) {
    console.error("Error fetching product usage:", error)
    // Return a default value if there's an error
    return {
      productsUsed: 0,
    }
  }
}

// Get user membership history
export async function getMembershipHistory(userId: number) {
  try {
    const history = await queryDb(
      `
      SELECT 
        mh.*,
        from_plan.name as from_plan_name,
        to_plan.name as to_plan_name
      FROM membership_history mh
      LEFT JOIN membership_plans from_plan ON mh.from_plan_id = from_plan.id
      LEFT JOIN membership_plans to_plan ON mh.to_plan_id = to_plan.id
      WHERE mh.user_id = $1
      ORDER BY mh.change_date DESC
    `,
      [userId],
    )

    return history
  } catch (error) {
    console.error("Error fetching membership history:", error)
    return []
  }
}

// Change membership plan
export async function changeMembershipPlan(prevState: any, formData: FormData) {
  try {
    const userId = Number(formData.get("userId"))
    const planId = Number(formData.get("planId"))
    const reason = (formData.get("reason") as string) || "User initiated"

    // Generate a billing session ID to track this process
    const billingSessionId = generateBillingSessionId()

    // Get current user
    const user = await getCurrentUser()
    if (!user || user.id !== userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Get current plan
    const currentMembership = await getUserMembership(userId)

    // Get plan details
    const planResult = await queryDb(
      `
      SELECT * FROM membership_plans WHERE id = $1
    `,
      [planId],
    )

    if (planResult.length === 0) {
      return { success: false, message: "Plan not found" }
    }

    const plan = planResult[0]

    // Log the initiation event
    await logBillingEvent({
      userId,
      eventType: "membership_change_initiated",
      planId,
      status: "initiated",
      sessionId: billingSessionId,
      details: {
        from_plan_id: currentMembership?.plan_id,
        to_plan_id: planId,
        reason,
        initiated_at: new Date().toISOString(),
      },
    })

    // If changing to a free plan, handle it directly
    if (plan.price <= 0) {
      await queryDb("BEGIN")

      try {
        // Update current membership to inactive if exists
        if (currentMembership) {
          await queryDb(
            `
            UPDATE user_memberships
            SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
            WHERE user_id = $1 AND status = 'active'
          `,
            [userId],
          )
        }

        // Create new membership
        const newMembershipResult = await queryDb(
          `
          INSERT INTO user_memberships (user_id, plan_id, status, start_date)
          VALUES ($1, $2, 'active', NOW())
          RETURNING id
        `,
          [userId, planId],
        )

        const newMembershipId = newMembershipResult[0].id

        // Update user's current plan
        await queryDb(
          `
          UPDATE users
          SET current_plan_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
          [planId, userId],
        )

        // Record in history
        if (currentMembership) {
          await queryDb(
            `
            INSERT INTO membership_history (user_id, from_plan_id, to_plan_id, change_reason)
            VALUES ($1, $2, $3, $4)
          `,
            [userId, currentMembership.plan_id, planId, reason],
          )
        }

        await queryDb("COMMIT")

        // Log the success event
        await logBillingEvent({
          userId,
          eventType: "membership_changed",
          planId,
          status: "active",
          sessionId: billingSessionId,
          details: {
            from_plan_id: currentMembership?.plan_id,
            to_plan_id: planId,
            membership_id: newMembershipId,
            reason,
            completed_at: new Date().toISOString(),
          },
        })

        revalidatePath("/dashboard/memberships")
        revalidatePath("/dashboard")

        return {
          success: true,
          message: `Successfully changed to ${plan.name} plan`,
          plan,
        }
      } catch (error) {
        await queryDb("ROLLBACK")
        throw error
      }
    }

    // If changing to a paid plan, redirect to Shopify billing
    // First, get the connected store directly from the database to ensure we have the most up-to-date information
    const storeResult = await queryDb(
      `
      SELECT s.*, t.access_token
      FROM shopify_stores s
      LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.updated_at DESC
      LIMIT 1
      `,
      [userId],
    )

    if (storeResult.length === 0 || !storeResult[0].access_token) {
      return {
        success: false,
        message: "You need to connect your Shopify store before upgrading to a paid plan.",
      }
    }

    const connectedStore = storeResult[0]

    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Check if a pending membership already exists
      const existingPending = await queryDb(
        `
        SELECT id FROM user_memberships 
        WHERE user_id = $1 AND plan_id = $2 AND status = 'pending'
        `,
        [userId, planId],
      )

      let pendingMembershipId: number

      if (existingPending.length > 0) {
        // Update existing pending membership
        pendingMembershipId = existingPending[0].id
        await queryDb(
          `
          UPDATE user_memberships
          SET updated_at = NOW(), session_id = $1
          WHERE id = $2
          `,
          [billingSessionId, pendingMembershipId],
        )
      } else {
        // Create new pending membership
        const result = await queryDb(
          `
          INSERT INTO user_memberships (user_id, plan_id, status, start_date, session_id)
          VALUES ($1, $2, 'pending', NOW(), $3)
          RETURNING id
          `,
          [userId, planId, billingSessionId],
        )
        pendingMembershipId = result[0].id
      }

      await queryDb("COMMIT")

      // Log the pending membership creation
      await logBillingEvent({
        userId,
        eventType: "membership_pending_created",
        planId,
        status: "pending",
        sessionId: billingSessionId,
        details: {
          membership_id: pendingMembershipId,
          created_at: new Date().toISOString(),
        },
      })

      // Return success with redirect URL - ENSURE storeId is included
      return {
        success: true,
        redirectToShopify: true,
        redirectUrl: `/api/shopify/start-billing?planId=${planId}&userId=${userId}&storeId=${connectedStore.id}&sessionId=${billingSessionId}`,
        message: "Redirecting to Shopify for billing...",
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error changing membership plan:", error)
    return { success: false, message: error.message || "Failed to change membership plan" }
  }
}

// Start Shopify billing process
export async function startShopifyBilling(planId: number, userId: number, sessionId?: string) {
  try {
    // Get plan details
    const planResult = await queryDb(
      `
      SELECT * FROM membership_plans WHERE id = $1
    `,
      [planId],
    )

    if (planResult.length === 0) {
      return {
        success: false,
        message: "Plan not found",
      }
    }

    const plan = planResult[0]

    // Get connected Shopify store directly from the database
    const storeResult = await queryDb(
      `
      SELECT s.*, t.access_token
      FROM shopify_stores s
      LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.updated_at DESC
      LIMIT 1
      `,
      [userId],
    )

    if (storeResult.length === 0 || !storeResult[0].access_token) {
      return {
        success: false,
        message: "Shopify store not connected. Please connect your store before upgrading.",
      }
    }

    const connectedStore = storeResult[0]

    // Create a pending membership record if one doesn't exist
    const existingPending = await queryDb(
      `
      SELECT id FROM user_memberships 
      WHERE user_id = $1 AND plan_id = $2 AND status = 'pending'
      `,
      [userId, planId],
    )

    if (existingPending.length === 0) {
      // Create new pending membership
      await queryDb(
        `
        INSERT INTO user_memberships (user_id, plan_id, status, start_date, session_id)
        VALUES ($1, $2, 'pending', NOW(), $3)
        `,
        [userId, planId, sessionId || generateBillingSessionId()],
      )
    } else if (sessionId) {
      // Update existing pending membership with session ID if provided
      await queryDb(
        `
        UPDATE user_memberships
        SET updated_at = NOW(), session_id = $1
        WHERE id = $2
        `,
        [sessionId, existingPending[0].id],
      )
    }

    // Return success with redirect URL - ENSURE storeId is included
    return {
      success: true,
      redirectUrl: `/api/shopify/start-billing?planId=${planId}&userId=${userId}&storeId=${connectedStore.id}&sessionId=${sessionId || ""}`,
    }
  } catch (error: any) {
    console.error("Error starting Shopify billing:", error)
    return {
      success: false,
      message: error.message || "An error occurred while starting the billing process",
    }
  }
}

// Confirm Shopify billing
export async function confirmShopifyBilling(userId: number, planId: number, chargeId?: string, sessionId?: string) {
  try {
    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Get current membership
      const currentMembership = await getUserMembership(userId)

      // Get connected Shopify store directly from the database
      const storeResult = await queryDb(
        `
        SELECT s.*, t.access_token
        FROM shopify_stores s
        LEFT JOIN shopify_auth_tokens t ON s.id = t.store_id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.updated_at DESC
        LIMIT 1
        `,
        [userId],
      )

      if (storeResult.length === 0) {
        throw new Error("No connected Shopify store found")
      }

      const connectedStore = storeResult[0]
      const accessToken = connectedStore.access_token

      if (!accessToken) {
        throw new Error("No Shopify access token found")
      }

      // If chargeId is provided, fetch charge details from Shopify
      let billingDetails = null
      let nextBillingDate = null
      let trialEndDate = null

      if (chargeId) {
        try {
          const response = await fetch(
            `https://${connectedStore.shop_domain}/admin/api/${process.env.SHOPIFY_API_VERSION || "2023-10"}/recurring_application_charges/${chargeId}.json`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
            },
          )

          if (response.ok) {
            const data = await response.json()
            const charge = data.recurring_application_charge

            billingDetails = charge

            // Extract next billing date and trial end date if available
            if (charge.billing_on) {
              nextBillingDate = new Date(charge.billing_on)
            }

            if (charge.trial_ends_on) {
              trialEndDate = new Date(charge.trial_ends_on)
            }
          }
        } catch (error) {
          console.error("Error fetching charge details from Shopify:", error)
          // Continue with the process even if we can't fetch charge details
        }
      }

      // Update current membership to inactive if exists
      if (currentMembership) {
        await queryDb(
          `
          UPDATE user_memberships
          SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
          WHERE user_id = $1 AND status = 'active'
        `,
          [userId],
        )
      }

      // Update pending membership to active
      const updateResult = await queryDb(
        `
        UPDATE user_memberships
        SET 
          status = 'active', 
          shopify_charge_id = $1, 
          updated_at = NOW(),
          next_billing_date = $2,
          trial_end_date = $3,
          billing_status = 'active',
          billing_details = $4
        WHERE user_id = $5 AND plan_id = $6 AND status = 'pending'
        RETURNING id
      `,
        [
          chargeId || null,
          nextBillingDate,
          trialEndDate,
          billingDetails ? JSON.stringify(billingDetails) : null,
          userId,
          planId,
        ],
      )

      // If no pending membership found, create a new one
      let newMembershipId: number
      if (updateResult.length === 0) {
        const insertResult = await queryDb(
          `
          INSERT INTO user_memberships (
            user_id, 
            plan_id, 
            status, 
            shopify_charge_id, 
            start_date,
            next_billing_date,
            trial_end_date,
            billing_status,
            billing_details
          )
          VALUES ($1, $2, 'active', $3, NOW(), $4, $5, 'active', $6)
          RETURNING id
        `,
          [
            userId,
            planId,
            chargeId || null,
            nextBillingDate,
            trialEndDate,
            billingDetails ? JSON.stringify(billingDetails) : null,
          ],
        )
        newMembershipId = insertResult[0].id
      } else {
        newMembershipId = updateResult[0].id
      }

      // Update user's current plan
      await queryDb(
        `
        UPDATE users
        SET current_plan_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
        [planId, userId],
      )

      // Record in history
      await queryDb(
        `
        INSERT INTO membership_history (
          user_id, 
          from_plan_id, 
          to_plan_id, 
          change_reason,
          change_date
        )
        VALUES ($1, $2, $3, $4, NOW())
      `,
        [userId, currentMembership?.plan_id || null, planId, "Shopify billing confirmed"],
      )

      // Commit transaction
      await queryDb("COMMIT")

      // Log the billing confirmation
      await logBillingEvent({
        userId,
        eventType: "membership_billing_confirmed",
        chargeId: chargeId || null,
        planId,
        status: "active",
        sessionId: sessionId,
        details: {
          membership_id: newMembershipId,
          next_billing_date: nextBillingDate,
          trial_end_date: trialEndDate,
          confirmed_at: new Date().toISOString(),
        },
      })

      // Revalidate paths
      revalidatePath("/dashboard/memberships")
      revalidatePath("/dashboard")

      return {
        success: true,
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error confirming Shopify billing:", error)
    return {
      success: false,
      message: error.message || "An error occurred while confirming your subscription",
    }
  }
}

// Cancel Shopify billing
export async function cancelShopifyBilling(userId: number, reason?: string) {
  try {
    // Get current membership
    const currentMembership = await getUserMembership(userId)

    if (!currentMembership) {
      return {
        success: false,
        message: "No active subscription found",
      }
    }

    // Begin transaction
    await queryDb("BEGIN")

    try {
      // Update current membership to inactive
      await queryDb(
        `
        UPDATE user_memberships
        SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `,
        [userId],
      )

      // Get free plan
      const freePlanResult = await queryDb(
        `
        SELECT id FROM membership_plans WHERE slug = 'free' LIMIT 1
      `,
      )

      const freePlanId = freePlanResult.length > 0 ? freePlanResult[0].id : null

      // Create new membership with free plan
      let newMembershipId: number | null = null
      if (freePlanId) {
        const result = await queryDb(
          `
          INSERT INTO user_memberships (user_id, plan_id, status, start_date)
          VALUES ($1, $2, 'active', NOW())
          RETURNING id
        `,
          [userId, freePlanId],
        )
        newMembershipId = result[0].id

        // Update user's current plan
        await queryDb(
          `
          UPDATE users
          SET current_plan_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
          [freePlanId, userId],
        )
      }

      // Record in history
      await queryDb(
        `
        INSERT INTO membership_history (user_id, previous_plan_id, new_plan_id, notes, change_type, change_date)
        VALUES ($1, $2, $3, $4, 'downgrade', NOW())
      `,
        [userId, currentMembership.plan_id, freePlanId, reason || "Subscription cancelled"],
      )

      // Commit transaction
      await queryDb("COMMIT")

      // Log the cancellation
      await logBillingEvent({
        userId,
        eventType: "membership_cancelled",
        chargeId: currentMembership.shopify_charge_id,
        planId: currentMembership.plan_id,
        status: "cancelled",
        details: {
          reason,
          new_membership_id: newMembershipId,
          cancelled_at: new Date().toISOString(),
        },
      })

      // Revalidate paths
      revalidatePath("/dashboard/memberships")
      revalidatePath("/dashboard")

      return {
        success: true,
        message: "Your subscription has been cancelled",
      }
    } catch (error) {
      // Rollback on error
      await queryDb("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error cancelling Shopify billing:", error)
    return {
      success: false,
      message: error.message || "An error occurred while cancelling your subscription",
    }
  }
}

// Get user's billing events
export async function getUserBillingEvents(userId: number) {
  try {
    // Check if billing_events table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'billing_events'
      );
    `)

    if (!tableExists[0].exists) {
      console.log("Billing events table does not exist yet")
      return []
    }

    const events = await queryDb(
      `
      SELECT 
        be.*,
        mp.name as plan_name
      FROM billing_events be
      LEFT JOIN membership_plans mp ON be.plan_id = mp.id
      WHERE be.user_id = $1
      ORDER BY be.created_at DESC
    `,
      [userId],
    )

    return events
  } catch (error) {
    console.error("Error fetching billing events:", error)
    return []
  }
}
