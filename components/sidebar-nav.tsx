"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface SidebarNavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: LucideIcon
  label?: string
  items?: SidebarNavItem[]
}

interface SidebarNavProps {
  items: SidebarNavItem[]
  className?: string
}

interface SidebarNavItemProps {
  href: string
  title: string
  icon?: LucideIcon
  disabled?: boolean
  className?: string
}

export function SidebarNavItem({ href, title, icon: Icon, disabled, className }: SidebarNavItemProps) {
  const pathname = usePathname()

  return (
    <Link
      href={disabled ? "/" : href}
      className={cn(
        "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        pathname === href ? "bg-accent" : "transparent",
        disabled && "cursor-not-allowed opacity-80",
        className,
      )}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      <span>{title}</span>
    </Link>
  )
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("grid items-start gap-2", className)}>
      {items.map((item, index) => {
        const Icon = item.icon
        return item.href ? (
          <SidebarNavItem key={index} href={item.href} title={item.title} icon={Icon} disabled={item.disabled} />
        ) : (
          <span
            key={index}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {item.title}
            {item.label && <span className="ml-auto text-xs">{item.label}</span>}
          </span>
        )
      })}
    </nav>
  )
}
