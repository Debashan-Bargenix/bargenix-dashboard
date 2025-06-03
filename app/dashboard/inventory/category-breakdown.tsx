"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ArrowUpDown, DollarSign, Tag, Users } from "lucide-react"

interface CategoryItem {
  name: string
  count: number
  value: number
  bargainingEnabled?: number
  currency?: string
}

interface CategoryBreakdownProps {
  categories: CategoryItem[]
  isLoading?: boolean
  currency?: string
}

export function CategoryBreakdown({ categories = [], isLoading = false, currency = "USD" }: CategoryBreakdownProps) {
  const [view, setView] = useState<"all" | "enabled" | "disabled">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "count" | "value" | "enabled">("count")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Add bargaining enabled count if not provided
  const categoriesWithBargaining = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return []

    return categories.map((cat) => ({
      ...cat,
      name: cat.name || "Uncategorized", // Ensure we always have a name
      bargainingEnabled: cat.bargainingEnabled !== undefined ? cat.bargainingEnabled : 0, // Default to 0 instead of random
      currency: cat.currency || currency,
    }))
  }, [categories, currency])

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    if (!categoriesWithBargaining || !Array.isArray(categoriesWithBargaining)) return []

    let filtered = [...categoriesWithBargaining].filter((cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (view === "enabled") {
      filtered = filtered.filter((cat) => (cat.bargainingEnabled || 0) > 0)
    } else if (view === "disabled") {
      filtered = filtered.filter((cat) => (cat.bargainingEnabled || 0) < cat.count)
    }

    return filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "count":
          comparison = a.count - b.count
          break
        case "value":
          comparison = a.value - b.value
          break
        case "enabled":
          comparison = (a.bargainingEnabled || 0) - (b.bargainingEnabled || 0)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [categoriesWithBargaining, searchTerm, view, sortBy, sortDirection])

  // Format currency
  const formatCurrency = (value: number, currencyCode: string = currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[180px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[250px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
              ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Distribution of products across categories</CardDescription>
            </div>
            <Tabs defaultValue="all" className="w-[300px]" onValueChange={(v) => setView(v as any)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="enabled">Bargaining On</TabsTrigger>
                <TabsTrigger value="disabled">Bargaining Off</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="count">Product Count</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="enabled">Bargaining Enabled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              className="h-10 w-10"
            >
              <ArrowUpDown className={`h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card key={category.name} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start p-4">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium truncate">{category.name}</h3>
                      <Badge variant={category.bargainingEnabled > 0 ? "default" : "outline"}>
                        {category.bargainingEnabled > 0 ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {category.count} {category.count === 1 ? "product" : "products"} in this category
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div
                      className="h-1.5 bg-primary rounded-full"
                      style={{
                        width: `${((category.bargainingEnabled || 0) / Math.max(category.count, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="border-t px-4 py-3 bg-muted/10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{category.bargainingEnabled}</span>
                        <span className="text-muted-foreground"> with bargaining</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatCurrency(category.value, category.currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Products
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No matching categories found" : "No categories found"}
              </p>
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2">
                  Clear search
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
