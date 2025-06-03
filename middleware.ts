import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl

  // Check if this is an API route that needs CORS headers
  const needsCors =
    pathname.startsWith("/api/bargain") ||
    pathname.startsWith("/api/button-config") ||
    pathname.startsWith("/api/widget-settings")

  // For API routes that need CORS, add the headers
  if (needsCors) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      })
    }

    // Clone the response to add CORS headers
    const response = NextResponse.next()

    // Add CORS headers to the response
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    return response
  }

  // For authentication routes, check session
  const sessionToken = request.cookies.get("session_token")?.value

  // Public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/signup",
    "/api/public",
    "/api/auth", // Shopify OAuth initiation
    "/api/shopify/callback", // Shopify OAuth callback
    "/api/shopify/webhooks", // Shopify webhooks
    "/chatbot",
    "/api/bargain",
    "/api/button-config",
    "/bargain-widget.js",
    "/bargain-button.js",
    "/bargain-button-direct.js",
    "/enhanced-widget.js",
    "/direct-button.js",
  ]

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // If the path is public, skip authentication check
  if (isPublicPath) {
    return NextResponse.next()
  }

  // If there's no session token, redirect to login
  if (!sessionToken) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // If the path is login or signup and there's a session token, redirect to dashboard
  if ((pathname.startsWith("/login") || pathname.startsWith("/signup")) && sessionToken) {
    const url = new URL("/dashboard", request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Use a simpler matcher that explicitly excludes static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/public (our public API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (.js, .css, etc.)
     */
    "/((?!api/public|_next/static|_next/image|favicon\\.ico|.*\\.js|.*\\.css|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
}
