"use client"

import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function MembershipSuccess() {
  const searchParams = useSearchParams()

  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const plan = searchParams.get("plan")
  const name = searchParams.get("name")
  const message = searchParams.get("message")

  if (!success && !error) {
    return null
  }

  return (
    <>
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {plan && name
              ? `You've successfully upgraded to the ${name} plan!`
              : "Your membership has been updated successfully!"}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error === "billing_failed"
              ? message || "There was an issue processing your billing request. Please try again."
              : error === "shopify_not_connected"
                ? message || "Your Shopify store is not connected. Please connect your store first."
                : error === "shopify_api_error"
                  ? message || "There was an error communicating with Shopify. Please try again."
                  : error === "billing_declined"
                    ? message || "Your subscription was not approved. Please try again."
                    : error === "billing_activation_failed"
                      ? message || "There was an error activating your subscription. Please try again."
                      : message || "An error occurred while updating your membership. Please try again."}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
