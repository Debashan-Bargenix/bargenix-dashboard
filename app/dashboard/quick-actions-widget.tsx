"use client"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Button } from "@/components/ui/button"
import { Zap, Plus, RefreshCw, Settings, BarChart, MessageSquare } from "lucide-react"
import Link from "next/link"

export function QuickActionsWidget() {
  return (
    <DashboardCard title="Quick Actions" icon={<Zap className="h-5 w-5 text-amber-600" />} gradient="amber">
      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline" className="h-auto p-3 flex-col">
          <Link href="/dashboard/inventory">
            <Plus className="h-4 w-4 mb-1" />
            <span className="text-xs">Add Products</span>
          </Link>
        </Button>

        <Button asChild size="sm" variant="outline" className="h-auto p-3 flex-col">
          <Link href="/dashboard/shopify">
            <RefreshCw className="h-4 w-4 mb-1" />
            <span className="text-xs">Sync Store</span>
          </Link>
        </Button>

        <Button asChild size="sm" variant="outline" className="h-auto p-3 flex-col">
          <Link href="/dashboard/chatbot">
            <Settings className="h-4 w-4 mb-1" />
            <span className="text-xs">Button Settings</span>
          </Link>
        </Button>

        <Button asChild size="sm" variant="outline" className="h-auto p-3 flex-col">
          <Link href="/dashboard/analytics">
            <BarChart className="h-4 w-4 mb-1" />
            <span className="text-xs">View Reports</span>
          </Link>
        </Button>

        <Button asChild size="sm" variant="outline" className="h-auto p-3 flex-col col-span-2">
          <Link href="/dashboard/request-bargain">
            <MessageSquare className="h-4 w-4 mb-1" />
            <span className="text-xs">Review Bargain Requests</span>
          </Link>
        </Button>
      </div>
    </DashboardCard>
  )
}
