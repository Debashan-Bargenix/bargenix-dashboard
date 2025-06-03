"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function logout() {
  // Clear authentication cookies
  const cookieStore = cookies()
  cookieStore.delete("session")
  cookieStore.delete("user")

  // Redirect to login page
  redirect("/login")
}
