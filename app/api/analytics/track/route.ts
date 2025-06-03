import { type NextRequest, NextResponse } from "next/server"
import { queryDb } from "@/lib/db"
import crypto from "crypto"

// Queue for batching analytics events
let analyticsQueue: any[] = []
let processingQueue = false
const QUEUE_PROCESS_INTERVAL = 10000 // Process queue every 10 seconds
const MAX_QUEUE_SIZE = 50 // Process queue when it reaches this size

// Set up queue processing interval
if (typeof setInterval !== "undefined") {
  setInterval(processAnalyticsQueue, QUEUE_PROCESS_INTERVAL)
}

async function processAnalyticsQueue() {
  if (processingQueue || analyticsQueue.length === 0) return

  processingQueue = true
  const eventsToProcess = [...analyticsQueue]
  analyticsQueue = []

  try {
    // Check if table exists before attempting to insert
    const tableExists = await checkTableExists()

    if (tableExists) {
      // Batch insert events
      await batchInsertEvents(eventsToProcess)
    }
  } catch (error) {
    console.error("Error processing analytics queue:", error)
    // If processing fails, add events back to queue
    analyticsQueue = [...eventsToProcess, ...analyticsQueue]
  } finally {
    processingQueue = false
  }
}

async function checkTableExists() {
  try {
    const result = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bargain_events'
      );
    `)
    return result[0]?.exists === true
  } catch (error) {
    console.error("Error checking if table exists:", error)
    return false
  }
}

async function batchInsertEvents(events: any[]) {
  if (events.length === 0) return

  // Create a parameterized query for batch insert
  const valueStrings = []
  const valueParams = []
  let paramIndex = 1

  for (const event of events) {
    const valueClause = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    valueStrings.push(valueClause)

    valueParams.push(
      event.shop,
      event.productId,
      event.variantId || null,
      event.eventType,
      event.sessionId || null,
      event.userAgent,
      event.referrer || null,
      event.ipHash,
      event.deviceType,
      event.country || null,
      event.region || null,
      event.city || null,
      event.productTitle || null,
      event.productPrice || null,
      event.currency || "USD",
      event.eventData ? JSON.stringify(event.eventData) : null,
    )
  }

  const query = `
    INSERT INTO bargain_events (
      shop_domain,
      product_id,
      variant_id,
      event_type,
      session_id,
      user_agent,
      referrer,
      ip_hash,
      device_type,
      country,
      region,
      city,
      product_title,
      product_price,
      currency,
      event_data
    ) VALUES ${valueStrings.join(", ")}
  `

  await queryDb(query, valueParams)
}

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 })
  }

  try {
    const data = await request.json()
    const clientIp = request.headers.get("x-forwarded-for") || "unknown"

    // Validate required fields
    if (!data.shop || !data.productId || !data.eventType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400, headers })
    }

    // Hash the IP address for privacy
    const ipHash = crypto
      .createHash("sha256")
      .update(clientIp + (process.env.NEXTAUTH_SECRET || "bargenix-salt"))
      .digest("hex")

    // Detect device type
    const userAgent = data.userAgent || request.headers.get("user-agent") || ""
    const deviceType = detectDeviceType(userAgent)

    // Prepare event data
    const eventData = {
      ...data,
      userAgent: undefined, // Remove from event_data as it's stored separately
      referrer: undefined, // Remove from event_data as it's stored separately
    }

    // Create event object
    const event = {
      shop: data.shop,
      productId: data.productId,
      variantId: data.variantId || null,
      eventType: data.eventType,
      sessionId: data.sessionId || null,
      userAgent,
      referrer: data.referrer || null,
      ipHash,
      deviceType,
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
      productTitle: data.productTitle || null,
      productPrice: data.productPrice || null,
      currency: data.currency || "USD",
      eventData,
    }

    // Add to queue instead of immediate insert
    analyticsQueue.push(event)

    // Process queue immediately if it gets too large
    if (analyticsQueue.length >= MAX_QUEUE_SIZE) {
      // Don't await this to keep response time fast
      processAnalyticsQueue()
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    console.error("Error tracking event:", error)
    return NextResponse.json({ success: false, error: "Failed to track event" }, { status: 500, headers })
  }
}

// Helper function to detect device type
function detectDeviceType(userAgent: string): string {
  if (!userAgent) return "unknown"

  const ua = userAgent.toLowerCase()

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
    return "mobile"
  } else if (ua.includes("tablet")) {
    return "tablet"
  } else {
    return "desktop"
  }
}
