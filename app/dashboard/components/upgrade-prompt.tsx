"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Crown } from "lucide-react"

interface UpgradePromptProps {
  title?: string
  description?: string
  features?: string[]
  planName?: string
}

export default function UpgradePrompt({
  title = "Upgrade Your Plan",
  description = "Unlock premium features to get the most out of Bargenix",
  features = ["Add unlimited products", "Advanced bargaining controls", "Custom widget themes", "Priority support"],
  planName = "Business Plan",
}: UpgradePromptProps) {
  const router = useRouter()

  return (
    <Card className="border-2 border-amber-200 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => router.push("/dashboard/memberships?tab=plans")}
        >
          Upgrade to {planName}
        </Button>
      </CardFooter>
    </Card>
  )
}
