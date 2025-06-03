import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ""
const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  "read_products,write_products,read_script_tags,write_script_tags,read_themes,write_content,read_shop"
const APP_PRODUCTION_URL = "https://dashboard.bargenix.in" // Your app's production URL

function generateNonce() {
  return crypto.randomBytes(16).toString("hex")
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get("shop")
  // const host = searchParams.get("host"); // Shopify provides this, can be used if needed

  console.log(`API Auth Route (Shopify Init - Corrected): Received request for shop: ${shop}`)

  if (!shop) {
    console.error("API Auth Route (Shopify Init - Corrected): Missing shop parameter.")
    // According to Shopify, app should handle this gracefully.
    // Returning an error or redirecting to a generic app page might be suitable.
    // For testing, a clear error is good. For production, consider a user-friendly page.
    return NextResponse.json({ error: "Missing shop parameter from Shopify" }, { status: 400 })
  }

  const shopDomain = shop
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    console.error(`API Auth Route (Shopify Init - Corrected): Invalid shop parameter: ${shopDomain}`)
    return NextResponse.json({ error: "Invalid shop parameter format" }, { status: 400 })
  }

  const nonce = generateNonce()
  try {
    cookies().set("shopify_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure this is true in production
      maxAge: 300, // 5 minutes
      path: "/",
      sameSite: "lax", // Correct for OAuth redirects
    })
    console.log(`API Auth Route (Shopify Init - Corrected): Nonce cookie set for ${shopDomain}.`)
  } catch (cookieError) {
    console.error("API Auth Route (Shopify Init - Corrected): Error setting nonce cookie:", cookieError)
    // This is a server-side issue.
    return NextResponse.json({ error: "Failed to set up authentication session" }, { status: 500 })
  }

  const redirectUri = `${APP_PRODUCTION_URL}/api/shopify/callback`
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES}&redirect_uri=${redirectUri}&state=${nonce}&grant_options[]=per-user`

  console.log(`API Auth Route (Shopify Init - Corrected): Redirecting to Shopify auth URL: ${authUrl}`)
  return NextResponse.redirect(authUrl)
}
