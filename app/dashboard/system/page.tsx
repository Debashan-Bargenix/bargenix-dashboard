import { redirect } from "next/navigation"

export default async function SystemPage() {
  // Redirect to dashboard - system page is not available for clients
  redirect("/dashboard")
}
