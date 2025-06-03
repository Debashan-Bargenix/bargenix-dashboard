"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronDown,
  Search,
  X,
  ShoppingBag,
  BarChart,
  MessageSquare,
  CreditCard,
  Home,
  Package,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { logout } from "@/app/actions/auth-actions"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  user: any
}

// Define search result types
type SearchResultCategory = "pages" | "settings" | "products" | "users"

interface SearchResult {
  id: string
  title: string
  description: string
  url: string
  category: SearchResultCategory
  icon: React.ReactNode
}

// Mock search data - in a real app, this would come from an API
const searchData: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Main dashboard overview",
    url: "/dashboard",
    category: "pages",
    icon: <Home className="h-4 w-4" />,
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Manage your product inventory",
    url: "/dashboard/inventory",
    category: "pages",
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "View sales and performance metrics",
    url: "/dashboard/analytics",
    category: "pages",
    icon: <BarChart className="h-4 w-4" />,
  },
  {
    id: "chatbot",
    title: "Chatbot",
    description: "Configure your store chatbot",
    url: "/dashboard/chatbot",
    category: "pages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "shopify",
    title: "Shopify",
    description: "Manage your Shopify integration",
    url: "/dashboard/shopify",
    category: "settings",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    id: "account",
    title: "Account Settings",
    description: "Manage your account preferences",
    url: "/dashboard/account",
    category: "settings",
    icon: <User className="h-4 w-4" />,
  },
  {
    id: "memberships",
    title: "Memberships",
    description: "Manage your subscription plans",
    url: "/dashboard/memberships",
    category: "settings",
    icon: <CreditCard className="h-4 w-4" />,
  },
]

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.trim() === "") {
      setSearchResults([])
      return
    }

    // Filter search results based on query
    const filteredResults = searchData.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()),
    )

    setSearchResults(filteredResults)
    setSelectedResultIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev))
    }

    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }

    // Enter to navigate
    else if (e.key === "Enter" && selectedResultIndex >= 0) {
      e.preventDefault()
      const selectedResult = searchResults[selectedResultIndex]
      router.push(selectedResult.url)
      setSearchOpen(false)
      setSearchQuery("")
      setSearchResults([])
    }

    // Escape to close
    else if (e.key === "Escape") {
      setSearchOpen(false)
      setSearchQuery("")
      setSearchResults([])
    }
  }

  // Toggle search open/closed
  const toggleSearch = () => {
    setSearchOpen((prev) => !prev)
    if (!searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        toggleSearch()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResultIndex >= 0 && searchResultsRef.current) {
      const selectedElement = searchResultsRef.current.children[selectedResultIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedResultIndex])

  // Group results by category
  const groupedResults = searchResults.reduce(
    (acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = []
      }
      acc[result.category].push(result)
      return acc
    },
    {} as Record<SearchResultCategory, SearchResult[]>,
  )

  return (
    <header className="h-16 border-b bg-white z-30 px-6 flex items-center justify-between shadow-sm dark:bg-slate-900 dark:border-slate-800 shrink-0">
      <div className="flex-1 flex items-center">
        <div
          className={cn(
            "relative flex items-center transition-all duration-200 ease-in-out",
            searchOpen ? "w-full max-w-2xl" : "w-64",
          )}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none dark:text-slate-500">
            <Search className="h-4 w-4" />
          </div>

          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search dashboard... (Ctrl+K)"
            className="w-full h-9 pl-9 pr-4 focus-visible:ring-1 border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setSearchOpen(true)}
          />

          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
              onClick={() => {
                setSearchQuery("")
                setSearchResults([])
                searchInputRef.current?.focus()
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Clear</span>
            </Button>
          )}

          {searchOpen && searchResults.length > 0 && (
            <div
              ref={searchResultsRef}
              className="absolute top-full left-0 w-full mt-1 bg-white rounded-md border shadow-lg max-h-[400px] overflow-y-auto z-50 dark:bg-slate-800 dark:border-slate-700"
            >
              {Object.entries(groupedResults).map(([category, results]) => (
                <div key={category} className="py-1">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase dark:text-slate-400">
                    {category}
                  </div>
                  {results.map((result, index) => {
                    const resultIndex = searchResults.findIndex((r) => r.id === result.id)
                    return (
                      <Link
                        key={result.id}
                        href={result.url}
                        onClick={() => {
                          setSearchOpen(false)
                          setSearchQuery("")
                          setSearchResults([])
                        }}
                      >
                        <div
                          className={cn(
                            "px-3 py-2 flex items-start hover:bg-gray-50 cursor-pointer dark:hover:bg-slate-700",
                            resultIndex === selectedResultIndex && "bg-gray-100 dark:bg-slate-700",
                          )}
                        >
                          <div className="mr-2 mt-0.5 text-muted-foreground dark:text-slate-400">{result.icon}</div>
                          <div>
                            <div className="font-medium dark:text-slate-200">{result.title}</div>
                            <div className="text-xs text-muted-foreground dark:text-slate-400">
                              {result.description}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-full dark:hover:bg-slate-800"
            >
              <Avatar className="h-8 w-8 border shadow-sm">
                <AvatarImage src={user?.avatar_url || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 dark:bg-slate-800 dark:border-slate-700">
            <DropdownMenuLabel className="dark:text-slate-200">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate dark:text-slate-400">{user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="dark:border-slate-700" />
            <DropdownMenuItem asChild className="dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700">
              <Link href="/dashboard/account">My Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700">
              <Link href="/dashboard/memberships">Memberships</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="dark:border-slate-700" />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
              onClick={() => logout()}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

// For backward compatibility
export { Header as DashboardHeader }
