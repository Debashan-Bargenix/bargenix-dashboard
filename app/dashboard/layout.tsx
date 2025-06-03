import type React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { Toaster } from "@/components/ui/toaster"
import { getUser } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-56">
        <Header user={user} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        <Toaster />
      </div>
    </div>
  )
}
