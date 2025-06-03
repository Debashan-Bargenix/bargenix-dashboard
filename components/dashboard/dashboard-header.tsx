import type React from "react"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardHeader({ title, description, actions, className, ...props }: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center",
        className,
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
