import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "bargain-button.js")
    const fileContent = fs.readFileSync(filePath, "utf8")

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error serving bargain button script:", error)
    return new NextResponse("console.error('Error loading Bargenix script');", {
      status: 500,
      headers: {
        "Content-Type": "application/javascript",
      },
    })
  }
}
