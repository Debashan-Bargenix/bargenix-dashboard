/**
 * Billing Logger - Utility for logging billing events and operations
 */

import { queryDb } from "./db"

// Types for billing events
interface BillingEventData {
  userId: number
  eventType: string
  chargeId?: string
  planId?: number
  planSlug?: string
  amount?: number
  status: string
  shopDomain?: string
  sessionId?: string
  details?: any
}

// Types for billing logs
interface BillingLogData {
  userId: number | string
  logType: string
  endpoint: string
  requestData?: any
  responseData?: any
  errorDetails?: any
  shopDomain?: string
  sessionId?: string
}

/**
 * Generate a unique billing session ID for tracking billing flows
 */
export function generateBillingSessionId(): string {
  return `bill_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Log a billing event to the database
 */
export async function logBillingEvent(
  userId: number,
  eventType: string,
  chargeId: string | null,
  planId: number | null,
  planSlug: string | null,
  amount: number | null,
  status: string,
  details?: any,
  shopDomain?: string | null,
  sessionId?: string | null,
): Promise<void> {
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
      console.log("Billing events table does not exist, skipping log")
      return
    }

    // Insert the billing event
    await queryDb(
      `
      INSERT INTO billing_events (
        user_id, 
        shop_domain, 
        event_type, 
        charge_id, 
        plan_id, 
        plan_slug, 
        amount, 
        status, 
        details,
        session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        userId,
        shopDomain || null,
        eventType,
        chargeId || null,
        planId || null,
        planSlug || null,
        amount || null,
        status,
        details ? JSON.stringify(details) : null,
        sessionId || null,
      ],
    )
  } catch (error) {
    console.error("Error logging billing event:", error)
    // Don't throw the error to prevent disrupting the main flow
  }
}

/**
 * Log a billing operation to the database
 */
export async function logBillingError(
  userId: number | string,
  logType: string,
  endpoint: string,
  requestData?: any,
  responseData?: any,
  errorDetails?: any,
  shopDomain?: string,
  sessionId?: string,
): Promise<void> {
  try {
    // Check if billing_logs table exists
    const tableExists = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'billing_logs'
      );
    `)

    if (!tableExists[0].exists) {
      console.log("Billing logs table does not exist, skipping log")
      return
    }

    // Insert the billing log
    await queryDb(
      `
      INSERT INTO billing_logs (
        user_id, 
        shop_domain, 
        log_type, 
        endpoint, 
        request_data, 
        response_data, 
        error_details,
        session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        userId,
        shopDomain || null,
        logType,
        endpoint,
        requestData ? JSON.stringify(requestData) : null,
        responseData ? JSON.stringify(responseData) : null,
        errorDetails ? JSON.stringify(errorDetails) : null,
        sessionId || null,
      ],
    )
  } catch (error) {
    console.error("Error logging billing operation:", error)
    // Don't throw the error to prevent disrupting the main flow
  }
}

/**
 * Get incomplete billing sessions (started but not completed)
 */
export async function getIncompleteBillingSessions(userId?: number, daysAgo = 30) {
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
      console.log("Billing events table does not exist, skipping query")
      return []
    }

    // Query for incomplete billing sessions
    const query = userId
      ? `
        SELECT 
          session_id,
          user_id,
          MIN(created_at) as started_at,
          MAX(created_at) as last_activity,
          ARRAY_AGG(event_type ORDER BY created_at) as events
        FROM billing_events
        WHERE 
          created_at > NOW() - INTERVAL '${daysAgo} days'
          AND user_id = $1
          AND session_id IS NOT NULL
        GROUP BY session_id, user_id
        HAVING 
          ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_initiated']::varchar[]
          AND NOT (ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_confirmed']::varchar[])
          AND NOT (ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_cancelled']::varchar[])
        ORDER BY last_activity DESC
      `
      : `
        SELECT 
          session_id,
          user_id,
          MIN(created_at) as started_at,
          MAX(created_at) as last_activity,
          ARRAY_AGG(event_type ORDER BY created_at) as events
        FROM billing_events
        WHERE 
          created_at > NOW() - INTERVAL '${daysAgo} days'
          AND session_id IS NOT NULL
        GROUP BY session_id, user_id
        HAVING 
          ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_initiated']::varchar[]
          AND NOT (ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_confirmed']::varchar[])
          AND NOT (ARRAY_AGG(event_type ORDER BY created_at) @> ARRAY['billing_cancelled']::varchar[])
        ORDER BY last_activity DESC
      `

    const params = userId ? [userId] : []
    const results = await queryDb(query, params)

    return results
  } catch (error) {
    console.error("Error fetching incomplete billing sessions:", error)
    return []
  }
}
