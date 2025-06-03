import type React from "react"
import { cn } from "@/lib/utils"

interface DashboardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  headerClassName?: string
  noMargin?: boolean
  children?: React.ReactNode
}

export function DashboardSection({
  title,
  description,
  action,
  className,
  contentClassName,
  headerClassName,
  noMargin = false,
  children,
  ...props
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", !noMargin && "mb-8", className)} {...props}>
      {(title || description || action) && (
        <div className={cn("flex items-center justify-between", headerClassName)}>
          <div className="space-y-1">
            {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </section>
  )
}
