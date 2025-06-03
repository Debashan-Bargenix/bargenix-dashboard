"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { FileText, Settings, ShoppingBag, BarChart, MessageSquare, CreditCard } from "lucide-react"

type SearchResultCategory = "pages" | "settings" | "products" | "users"

interface SearchResult {
  id: string
  title: string
  description: string
  url: string
  category: SearchResultCategory
  icon: React.ReactNode
}

// Mock search data
const searchData: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Main dashboard overview",
    url: "/dashboard",
    category: "pages",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Manage your product inventory",
    url: "/dashboard/inventory",
    category: "pages",
    icon: <ShoppingBag className="h-4 w-4" />,
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
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "memberships",
    title: "Memberships",
    description: "Manage your subscription plans",
    url: "/dashboard/memberships",
    category: "settings",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "system",
    title: "System",
    description: "System health and maintenance",
    url: "/dashboard/system",
    category: "settings",
    icon: <Settings className="h-4 w-4" />,
  },
]

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => unknown) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {searchData
            .filter((item) => item.category === "pages")
            .map((result) => (
              <CommandItem key={result.id} onSelect={() => runCommand(() => router.push(result.url))}>
                <div className="mr-2 text-muted-foreground">{result.icon}</div>
                <div>
                  <p>{result.title}</p>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandGroup heading="Settings">
          {searchData
            .filter((item) => item.category === "settings")
            .map((result) => (
              <CommandItem key={result.id} onSelect={() => runCommand(() => router.push(result.url))}>
                <div className="mr-2 text-muted-foreground">{result.icon}</div>
                <div>
                  <p>{result.title}</p>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
