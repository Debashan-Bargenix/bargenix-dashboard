"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

interface FeatureAccessBannerProps {
  featureName: string
  planRequired: string
  description: string
}

export default function FeatureAccessBanner({ featureName, planRequired, description }: FeatureAccessBannerProps) {
  const router = useRouter()

  return (
    <Alert variant="warning" className="bg-amber-50 border-amber-200">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Feature Restricted</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-2">{description}</p>
        <Button
          variant="outline"
          size="sm"
          className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 hover:text-amber-900"
          onClick={() => router.push("/dashboard/memberships?tab=plans")}
        >
          Upgrade to {planRequired}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
