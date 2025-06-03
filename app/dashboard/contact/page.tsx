import { Suspense } from "react"
import { requireAuth } from "@/lib/auth"
import { getUserMembership } from "@/app/actions/membership-actions"
import { FeedbackForm } from "./components/feedback-form"
import { BugReportForm } from "./components/bug-report-form"
import { SupportLevel } from "./components/support-level"
import { ContactDetails } from "./components/contact-details"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function ContactSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function ContactContent() {
  const user = await requireAuth()
  const membership = await getUserMembership(user.id)

  const planName = membership?.name || "Free"
  const planSlug = membership?.slug || "free"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact & Support</h1>
        <p className="text-muted-foreground">Get help, share feedback, or report issues with our support team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupportLevel planName={planName} planSlug={planSlug} />
        <ContactDetails />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeedbackForm />
        <BugReportForm />
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactSkeleton />}>
      <ContactContent />
    </Suspense>
  )
}
