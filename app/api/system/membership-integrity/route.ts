import { NextResponse } from "next/server"

// This API route is not used anymore - system health is for admins only
export async function GET() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
}
