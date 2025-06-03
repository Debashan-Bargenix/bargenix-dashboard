"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface MembershipHistoryProps {
  history: any[]
}

export default function MembershipHistory({ history }: MembershipHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <p>No membership history found.</p>
            <p className="text-sm">Your plan changes will appear here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <HistoryItem key={index} item={item} />
      ))}
    </div>
  )
}

function HistoryItem({ item }: { item: any }) {
  const { from_plan_name, to_plan_name, change_date, change_reason } = item

  // Determine the type of change
  let changeType: "upgrade" | "downgrade" | "switch" = "switch"
  let icon = <RefreshCw className="h-5 w-5" />

  if (from_plan_name && to_plan_name) {
    // If we have both plans, determine if it's an upgrade or downgrade
    // This would typically be based on price, but we'll use the plan names for simplicity
    if (from_plan_name.includes("Free") && !to_plan_name.includes("Free")) {
      changeType = "upgrade"
      icon = <ArrowUpRight className="h-5 w-5 text-green-500" />
    } else if (!from_plan_name.includes("Free") && to_plan_name.includes("Free")) {
      changeType = "downgrade"
      icon = <ArrowDownRight className="h-5 w-5 text-amber-500" />
    }
  } else if (!from_plan_name && to_plan_name) {
    // Initial signup
    changeType = "upgrade"
    icon = <ArrowUpRight className="h-5 w-5 text-green-500" />
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="bg-muted rounded-full p-2">{icon}</div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {changeType === "upgrade"
                    ? "Upgraded to"
                    : changeType === "downgrade"
                      ? "Downgraded to"
                      : "Switched to"}{" "}
                  <span className="font-semibold">{to_plan_name || "Free Plan"}</span>
                </h3>
                {from_plan_name && (
                  <p className="text-sm text-muted-foreground">From {from_plan_name || "No previous plan"}</p>
                )}
              </div>
              <Badge
                variant={changeType === "upgrade" ? "default" : changeType === "downgrade" ? "outline" : "secondary"}
              >
                {changeType === "upgrade" ? "Upgrade" : changeType === "downgrade" ? "Downgrade" : "Plan Change"}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>{formatDate(change_date)}</p>
              {change_reason && <p className="mt-1 italic">"{change_reason}"</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
