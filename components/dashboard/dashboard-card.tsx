import type * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  icon?: React.ReactNode
  footer?: React.ReactNode
  badge?: React.ReactNode
  gradient?: "blue" | "green" | "purple" | "amber" | "rose" | "none"
}

export function DashboardCard({
  title,
  description,
  icon,
  footer,
  badge,
  gradient = "none",
  children,
  className,
  ...props
}: DashboardCardProps) {
  const gradientClasses = {
    blue: "from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10",
    green: "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10",
    purple: "from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10",
    amber: "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10",
    rose: "from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/10",
    none: "",
  }

  const gradientClass = gradient !== "none" ? `bg-gradient-to-br ${gradientClasses[gradient]}` : ""

  return (
    <Card
      className={cn(
        "overflow-hidden border border-gray-200 shadow-sm dark:border-slate-700 dark:bg-slate-800",
        gradientClass,
        className,
      )}
      {...props}
    >
      <CardHeader className="p-4">
        {(title || icon || badge) && (
          <div className="flex items-center justify-between">
            {icon && <div className="mr-2">{icon}</div>}
            {title && <CardTitle className="text-base font-semibold dark:text-slate-100">{title}</CardTitle>}
            {badge && <div>{badge}</div>}
          </div>
        )}
        {description && (
          <CardDescription className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
      {footer && <CardFooter className="p-4 pt-0">{footer}</CardFooter>}
    </Card>
  )
}
