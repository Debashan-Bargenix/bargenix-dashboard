import type React from "react"
import { cn } from "@/lib/utils"
import { DashboardCard } from "./dashboard-card"
import { Progress } from "@/components/ui/progress"

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  change?: {
    value: number
    isPositive: boolean
  }
  progress?: {
    value: number
    max: number
    color?: "blue" | "green" | "amber" | "purple" | "rose" | "default"
  }
  gradient?: "blue" | "purple" | "green" | "amber" | "rose" | "default"
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  change,
  progress,
  gradient = "default",
  className,
  ...props
}: StatsCardProps) {
  const progressColors = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    rose: "bg-rose-500",
    default: "bg-primary",
  }

  const changeColors = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-rose-600 dark:text-rose-400",
  }

  return (
    <DashboardCard title={title} icon={icon} gradient={gradient} className={cn("h-full", className)} {...props}>
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <div
              className={cn(
                "flex items-center text-xs font-medium",
                change.isPositive ? changeColors.positive : changeColors.negative,
              )}
            >
              {change.isPositive ? "↑" : "↓"} {Math.abs(change.value)}%
            </div>
          )}
        </div>

        {progress && (
          <div className="space-y-1">
            <Progress
              value={progress.value}
              max={progress.max}
              className="h-1.5"
              indicatorClassName={progressColors[progress.color || "default"]}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>
                {progress.value} / {progress.max}
              </div>
              <div>{Math.round((progress.value / progress.max) * 100)}%</div>
            </div>
          </div>
        )}

        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </DashboardCard>
  )
}
