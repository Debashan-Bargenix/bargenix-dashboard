"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Package,
  BarChart,
  ShoppingBag,
  User,
  LogOut,
  CreditCard,
  Menu,
  MessageSquare,
  HandCoins,
  Clipboard,
  ChevronDown,
  HeadphonesIcon,
} from "lucide-react"
import { logout } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart },
  { name: "Shopify", href: "/dashboard/shopify", icon: ShoppingBag },
  { name: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
  { name: "Request for Bargain", href: "/dashboard/request-bargain", icon: HandCoins },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: Clipboard,
    subItems: [
      { name: "Overview", href: "/dashboard/orders" },
      { name: "Bargaining Sessions", href: "/dashboard/orders/bargaining-sessions" },
      { name: "Discount Codes", href: "/dashboard/orders/discount-codes" },
      { name: "Chatbot Logs", href: "/dashboard/orders/chatbot-logs" },
    ],
  },
  { name: "Memberships", href: "/dashboard/memberships", icon: CreditCard },
  { name: "Contact & Support", href: "/dashboard/contact", icon: HeadphonesIcon },
  { name: "My Account", href: "/dashboard/account", icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
  }

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 rounded-md bg-white p-2 shadow-lg md:hidden dark:bg-gray-800"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open sidebar</span>
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-56 bg-white border-r border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700",
          // Mobile visibility
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Bargenix</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isDropdownOpen = openDropdowns[item.name]

              return (
                <div key={item.name}>
                  {hasSubItems ? (
                    <div>
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className={cn(
                          "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-700",
                          isActive
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                            : "text-gray-700 dark:text-gray-300",
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={cn(
                              "h-5 w-5 flex-shrink-0 mr-3",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300",
                            )}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", isDropdownOpen ? "rotate-180" : "")}
                        />
                      </button>
                      {isDropdownOpen && (
                        <div className="ml-8 mt-2 space-y-1">
                          {item.subItems.map((subItem) => {
                            const isSubActive = pathname === subItem.href
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={cn(
                                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700",
                                  isSubActive
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "text-gray-600 dark:text-gray-400",
                                )}
                              >
                                {subItem.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-700",
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 mr-3",
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300",
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                <LogOut className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                <AlertDialogDescription>You will be redirected to the login page.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={handleLogout}>
                    Logout
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>
    </>
  )
}

// For backward compatibility
export { Sidebar as DashboardSidebar }
