import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { AccountSkeleton } from "./components/account-skeleton"
import { AccountTabs } from "./components/account-tabs"
import { UserProfileCard } from "./components/user-profile-card"
import { ErrorBoundary } from "@/components/error-boundary"

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AccountPage() {
  // Get the current user
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ErrorBoundary fallback={<div>Error loading profile card</div>}>
            <Suspense fallback={<AccountSkeleton type="profile" />}>
              <UserProfileCard user={user} />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="md:col-span-2">
          <ErrorBoundary fallback={<div>Error loading account tabs</div>}>
            <Suspense fallback={<AccountSkeleton type="tabs" />}>
              <AccountTabs userId={user.id} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
