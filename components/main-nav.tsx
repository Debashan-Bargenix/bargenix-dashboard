"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface MainNavProps {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      active: pathname === "/dashboard/inventory",
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      active: pathname?.startsWith("/dashboard/analytics"),
    },
    {
      href: "/dashboard/orders",
      label: "Orders",
      active: pathname?.startsWith("/dashboard/orders"),
    },
    {
      href: "/dashboard/memberships",
      label: "Memberships",
      active: pathname?.startsWith("/dashboard/memberships"),
    },
    {
      href: "/dashboard/shopify",
      label: "Shopify",
      active: pathname === "/dashboard/shopify",
    },
    {
      href: "/dashboard/chatbot",
      label: "Chatbot",
      active: pathname === "/dashboard/chatbot",
    },
    {
      href: "/dashboard/contact",
      label: "Contact",
      active: pathname === "/dashboard/contact",
    },
    {
      href: "/dashboard/account",
      label: "Account",
      active: pathname?.startsWith("/dashboard/account"),
    },
  ]

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active ? "text-black dark:text-white" : "text-muted-foreground",
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
