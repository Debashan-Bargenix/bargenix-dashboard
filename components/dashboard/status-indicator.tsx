import type React from "react"
import { cn } from "@/lib/utils"

type StatusType = "success" | "warning" | "error" | "info" | "default"

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType
  text: string
  icon?: React.ReactNode
  className?: string
}

export function StatusIndicator({ status, text, icon, className, ...props }: StatusIndicatorProps) {
  const statusClasses = {
    success:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    error: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
    default: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/50",
  }

  const dotClasses = {
    success: "bg-green-500 dark:bg-green-400",
    warning: "bg-amber-500 dark:bg-amber-400",
    error: "bg-rose-500 dark:bg-rose-400",
    info: "bg-blue-500 dark:bg-blue-400",
    default: "bg-gray-500 dark:bg-gray-400",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClasses[status],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="h-3.5 w-3.5">{icon}</span>
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[status])} />
      )}
      {text}
    </div>
  )
}
