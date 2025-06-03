"use client"

import { useState, useMemo, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Package,
  Tag,
  Store,
  Layers,
  DollarSign,
  Settings,
  X,
  Check,
  ShoppingBag,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ProductBargainingSettings } from "./product-bargaining-settings"
import { VariantBargainingSettings } from "./variant-bargaining-settings"
import { BulkBargainingActions } from "./bulk-bargaining-actions"
import { getProductBargainingSettings } from "@/app/actions/bargaining-actions"
import { useToast } from "@/hooks/use-toast"
import { EnhancedPagination } from "./enhanced-pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ProductVariant {
  id: string
  title: string
  price: string
  sku: string
  inventory_quantity: number
  barcode?: string
}

interface Product {
  id: string
  title: string
  status: string
  product_type: string
  vendor: string
  variants: ProductVariant[]
  image?: { src: string }
  images?: { src: string }[]
}

// Add currency to the props interface
interface ProductTableProps {
  products: Product[]
  currency?: string
  isLoading?: boolean
  onRefresh?: () => Promise<void>
}

type SortField = "title" | "product_type" | "vendor" | "price" | "inventory" | "status" | "bargaining"
type SortDirection = "asc" | "desc"

export function ProductTable({ products, currency = "USD", isLoading = false, onRefresh }: ProductTableProps) {
  const { toast } = useToast()
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("title")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [bargainingFilter, setBargainingFilter] = useState<"all" | "enabled" | "disabled">("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [productSettingsOpen, setProductSettingsOpen] = useState<string | null>(null)
  const [variantSettingsOpen, setVariantSettingsOpen] = useState<{ productId: string; variantId: string } | null>(null)

  const [bargainingSettings, setBargainingSettings] = useState<Record<string, any>>({})
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Responsive state
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)")

  // Update active filter count
  useEffect(() => {
    let count = 0
    if (searchTerm) count++
    if (bargainingFilter !== "all") count++
    if (selectedCategories.length > 0) count++
    if (selectedVendors.length > 0) count++
    setActiveFilterCount(count)
  }, [searchTerm, bargainingFilter, selectedCategories, selectedVendors])

  const toggleProductExpanded = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product && product.variants.length > 1) {
      setExpandedProducts((prev) => ({
        ...prev,
        [productId]: !prev[productId],
      }))
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Load bargaining settings when products change
  useEffect(() => {
    const loadBargainingSettings = async () => {
      if (products.length === 0) return

      setIsLoadingSettings(true)

      try {
        const productIds = products.map((p) => p.id)
        const settings = await getProductBargainingSettings(productIds)

        // Convert to a map for easier lookup
        const settingsMap: Record<string, any> = {}

        settings.forEach((setting) => {
          if (!settingsMap[setting.product_id]) {
            settingsMap[setting.product_id] = {}
          }

          settingsMap[setting.product_id][setting.variant_id] = {
            bargaining_enabled: setting.bargaining_enabled,
            min_price: setting.min_price ? Number.parseFloat(setting.min_price) : 0,
            behavior: setting.behavior,
          }
        })

        setBargainingSettings(settingsMap)
      } catch (error) {
        console.error("Error loading bargaining settings:", error)
        toast({
          title: "Error",
          description: "Failed to load bargaining settings",
          variant: "destructive",
        })
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadBargainingSettings()
  }, [products, toast])

  // Extract unique categories and vendors
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    products.forEach((product) => {
      if (product.product_type) {
        uniqueCategories.add(product.product_type)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [products])

  const vendors = useMemo(() => {
    const uniqueVendors = new Set<string>()
    products.forEach((product) => {
      if (product.vendor) {
        uniqueVendors.add(product.vendor)
      }
    })
    return Array.from(uniqueVendors).sort()
  }, [products])

  // Check if a product has bargaining enabled for any variant
  const isProductBargainingEnabled = (productId: string) => {
    if (!bargainingSettings[productId]) return false

    return Object.values(bargainingSettings[productId]).some((setting: any) => setting.bargaining_enabled)
  }

  // Add a function to get the currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    switch (currencyCode) {
      case "EUR":
        return "€"
      case "GBP":
        return "£"
      case "JPY":
        return "¥"
      case "INR":
        return "₹"
      case "CAD":
      case "AUD":
      case "USD":
      default:
        return "$"
    }
  }

  // Format price with the correct currency
  const formatPrice = (price: string) => {
    const numericPrice = Number.parseFloat(price)
    return `${getCurrencySymbol(currency)}${numericPrice.toFixed(2)}`
  }

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Search filter
        const matchesSearch =
          (product.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.product_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.vendor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.variants.some(
            (v) =>
              (v.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (v.sku || "").toLowerCase().includes(searchTerm.toLowerCase()),
          )

        // Category filter with null check
        const matchesCategory =
          selectedCategories.length === 0 || selectedCategories.includes(product.product_type || "Uncategorized")

        // Vendor filter with null check
        const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(product.vendor || "")

        // Bargaining filter
        let matchesBargaining = true

        if (bargainingFilter === "enabled") {
          matchesBargaining = isProductBargainingEnabled(product.id)
        } else if (bargainingFilter === "disabled") {
          matchesBargaining = !isProductBargainingEnabled(product.id)
        }

        return matchesSearch && matchesCategory && matchesVendor && matchesBargaining
      })
      .sort((a, b) => {
        // Apply sorting with proper null checks
        if (sortField === "title") {
          const aTitle = a.title || ""
          const bTitle = b.title || ""
          return sortDirection === "asc" ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle)
        } else if (sortField === "product_type") {
          const aType = a.product_type || "Uncategorized"
          const bType = b.product_type || "Uncategorized"
          return sortDirection === "asc" ? aType.localeCompare(bType) : bType.localeCompare(aType)
        } else if (sortField === "vendor") {
          const aVendor = a.vendor || ""
          const bVendor = b.vendor || ""
          return sortDirection === "asc" ? aVendor.localeCompare(bVendor) : bVendor.localeCompare(aVendor)
        } else if (sortField === "price") {
          const aPrice = a.variants.length > 0 ? Number.parseFloat(a.variants[0].price || "0") : 0
          const bPrice = b.variants.length > 0 ? Number.parseFloat(b.variants[0].price || "0") : 0
          return sortDirection === "asc" ? aPrice - bPrice : bPrice - aPrice
        } else if (sortField === "inventory") {
          const aInventory = a.variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0)
          const bInventory = b.variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0)
          return sortDirection === "asc" ? aInventory - bInventory : bInventory - aInventory
        } else if (sortField === "status") {
          const aStatus = a.status || ""
          const bStatus = b.status || ""
          return sortDirection === "asc" ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus)
        } else if (sortField === "bargaining") {
          const aEnabled = isProductBargainingEnabled(a.id)
          const bEnabled = isProductBargainingEnabled(b.id)

          if (sortDirection === "asc") {
            return aEnabled === bEnabled ? 0 : aEnabled ? -1 : 1
          } else {
            return aEnabled === bEnabled ? 0 : aEnabled ? 1 : -1
          }
        }
        return 0
      })
  }, [
    products,
    searchTerm,
    sortField,
    sortDirection,
    selectedCategories,
    selectedVendors,
    bargainingFilter,
    bargainingSettings,
    currency,
  ])

  // Pagination logic
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedProducts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    setSelectedVendors([])
    setBargainingFilter("all")
    setSortField("title")
    setSortDirection("asc")
    setCurrentPage(1)
    setFilterOpen(false)
  }

  // Handle product selection
  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id)

      if (isSelected) {
        return prev.filter((p) => p.id !== product.id)
      } else {
        return [...prev, product]
      }
    })

    setSelectedProductIds((prev) => {
      const isSelected = prev.includes(product.id)

      if (isSelected) {
        return prev.filter((id) => id !== product.id)
      } else {
        return [...prev, product.id]
      }
    })
  }

  // Handle select all on current page
  const toggleSelectAll = () => {
    if (paginatedProducts.every((product) => selectedProductIds.includes(product.id))) {
      // If all products on the current page are selected, deselect them
      setSelectedProducts((prev) => prev.filter((product) => !paginatedProducts.some((p) => p.id === product.id)))
      setSelectedProductIds((prev) => prev.filter((id) => !paginatedProducts.some((p) => p.id === id)))
    } else {
      // Otherwise, select all products on the current page
      const newSelectedProducts = [...selectedProducts]
      const newSelectedProductIds = [...selectedProductIds]

      paginatedProducts.forEach((product) => {
        if (!selectedProductIds.includes(product.id)) {
          newSelectedProducts.push(product)
          newSelectedProductIds.push(product.id)
        }
      })

      setSelectedProducts(newSelectedProducts)
      setSelectedProductIds(newSelectedProductIds)
    }
  }

  // Handle settings refresh
  const handleSettingsChanged = async () => {
    setIsRefreshing(true)

    try {
      // First refresh the settings
      setIsLoadingSettings(true)
      const productIds = products.map((p) => p.id)
      const settings = await getProductBargainingSettings(productIds)

      // Convert to a map for easier lookup
      const settingsMap: Record<string, any> = {}

      settings.forEach((setting) => {
        if (!settingsMap[setting.product_id]) {
          settingsMap[setting.product_id] = {}
        }

        settingsMap[setting.product_id][setting.variant_id] = {
          bargaining_enabled: setting.bargaining_enabled,
          min_price: setting.min_price ? Number.parseFloat(setting.min_price) : 0,
          behavior: setting.behavior,
        }
      })

      setBargainingSettings(settingsMap)

      // Then refresh the entire inventory data if onRefresh is provided
      if (onRefresh) {
        await onRefresh()
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSettings(false)
      setIsRefreshing(false)
    }
  }

  // Render loading skeleton
  if (isLoading || isRefreshing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                    <TableHead className="text-right">Bargaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[200px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-[80px] ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-[60px] ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-[80px] ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-[40px] ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <BulkBargainingActions selectedProducts={selectedProducts} onSettingsChanged={handleSettingsChanged} />

              {/* Enhanced Filter Popover */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className={activeFilterCount > 0 ? "relative" : ""}>
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[320px] p-0 shadow-lg border-border dark:border-slate-700"
                  align="end"
                  sideOffset={5}
                >
                  <div className="flex items-center justify-between border-b border-border dark:border-slate-700 p-3">
                    <h3 className="font-medium text-foreground dark:text-slate-100 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter Products
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      onClick={resetFilters}
                    >
                      Reset
                    </Button>
                  </div>

                  <Tabs defaultValue="bargaining" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/50 dark:bg-slate-800/50">
                      <TabsTrigger value="bargaining" className="text-xs py-1.5">
                        Bargaining
                      </TabsTrigger>
                      <TabsTrigger value="categories" className="text-xs py-1.5">
                        Categories
                      </TabsTrigger>
                      <TabsTrigger value="vendors" className="text-xs py-1.5">
                        Vendors
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bargaining" className="p-3 space-y-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground dark:text-slate-200">Bargaining Status</h4>
                        <RadioGroup
                          value={bargainingFilter}
                          onValueChange={(value) => setBargainingFilter(value as "all" | "enabled" | "disabled")}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="bargaining-all" />
                            <Label htmlFor="bargaining-all" className="text-sm cursor-pointer flex items-center gap-2">
                              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                              All Products
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="enabled" id="bargaining-enabled" />
                            <Label
                              htmlFor="bargaining-enabled"
                              className="text-sm cursor-pointer flex items-center gap-2"
                            >
                              <Check className="h-3.5 w-3.5 text-green-500" />
                              Bargaining Enabled
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="disabled" id="bargaining-disabled" />
                            <Label
                              htmlFor="bargaining-disabled"
                              className="text-sm cursor-pointer flex items-center gap-2"
                            >
                              <X className="h-3.5 w-3.5 text-red-500" />
                              Bargaining Disabled
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </TabsContent>

                    <TabsContent value="categories" className="p-0">
                      <div className="p-3 border-b border-border dark:border-slate-700">
                        <h4 className="text-sm font-medium text-foreground dark:text-slate-200 mb-2">
                          Product Categories
                        </h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          {selectedCategories.length === 0
                            ? "No categories selected"
                            : `${selectedCategories.length} ${selectedCategories.length === 1 ? "category" : "categories"} selected`}
                        </p>
                      </div>

                      <ScrollArea className="h-[200px] px-3 py-2">
                        <div className="space-y-2">
                          {categories.length > 0 ? (
                            categories.map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${category}`}
                                  checked={selectedCategories.includes(category)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategories([...selectedCategories, category])
                                    } else {
                                      setSelectedCategories(selectedCategories.filter((c) => c !== category))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`category-${category}`}
                                  className="text-sm cursor-pointer flex-1 truncate"
                                >
                                  {category || "Uncategorized"}
                                </label>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">No categories available</p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="vendors" className="p-0">
                      <div className="p-3 border-b border-border dark:border-slate-700">
                        <h4 className="text-sm font-medium text-foreground dark:text-slate-200 mb-2">Vendors</h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          {selectedVendors.length === 0
                            ? "No vendors selected"
                            : `${selectedVendors.length} ${selectedVendors.length === 1 ? "vendor" : "vendors"} selected`}
                        </p>
                      </div>

                      <ScrollArea className="h-[200px] px-3 py-2">
                        <div className="space-y-2">
                          {vendors.length > 0 ? (
                            vendors.map((vendor) => (
                              <div key={vendor} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`vendor-${vendor}`}
                                  checked={selectedVendors.includes(vendor)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedVendors([...selectedVendors, vendor])
                                    } else {
                                      setSelectedVendors(selectedVendors.filter((v) => v !== vendor))
                                    }
                                  }}
                                />
                                <label htmlFor={`vendor-${vendor}`} className="text-sm cursor-pointer flex-1 truncate">
                                  {vendor}
                                </label>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">No vendors available</p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>

                  <div className="border-t border-border dark:border-slate-700 p-3 bg-muted/30 dark:bg-slate-800/30">
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => setFilterOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setFilterOpen(false)}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>Sort Products</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => toggleSort("title")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Product Name
                    </span>
                    {sortField === "title" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleSort("product_type")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </span>
                    {sortField === "product_type" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleSort("vendor")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Vendor
                    </span>
                    {sortField === "vendor" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleSort("price")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 flex items-center justify-center">$</span>
                      Price
                    </span>
                    {sortField === "price" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleSort("inventory")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Inventory
                    </span>
                    {sortField === "inventory" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleSort("bargaining")} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Bargaining
                    </span>
                    {sortField === "bargaining" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Active filters display */}
          {(selectedCategories.length > 0 ||
            selectedVendors.length > 0 ||
            bargainingFilter !== "all" ||
            searchTerm) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {searchTerm && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0" onClick={() => setSearchTerm("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}

              {bargainingFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {bargainingFilter === "enabled" ? "Bargaining Enabled" : "Bargaining Disabled"}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => setBargainingFilter("all")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}

              {selectedCategories.map((category) => (
                <Badge key={category} variant="outline" className="flex items-center gap-1">
                  Category: {category}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== category))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}

              {selectedVendors.map((vendor) => (
                <Badge key={vendor} variant="outline" className="flex items-center gap-1">
                  Vendor: {vendor}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => setSelectedVendors(selectedVendors.filter((v) => v !== vendor))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}

              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetFilters}>
                Clear All
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((product) => selectedProductIds.includes(product.id))
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all products"
                    />
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1"
                      onClick={() => toggleSort("title")}
                    >
                      Product
                      {sortField === "title" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className={isMobile ? "hidden" : ""}>
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1"
                      onClick={() => toggleSort("product_type")}
                    >
                      Category
                      {sortField === "product_type" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className={isMobile || isTablet ? "hidden" : ""}>
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1"
                      onClick={() => toggleSort("vendor")}
                    >
                      Vendor
                      {sortField === "vendor" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1 ml-auto"
                      onClick={() => toggleSort("price")}
                    >
                      Price
                      {sortField === "price" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className={`text-right ${isMobile ? "hidden" : ""}`}>
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1 ml-auto"
                      onClick={() => toggleSort("inventory")}
                    >
                      Inventory
                      {sortField === "inventory" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="p-0 font-medium flex items-center gap-1 ml-auto"
                      onClick={() => toggleSort("bargaining")}
                    >
                      Bargaining
                      {sortField === "bargaining" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => (
                    <>
                      <TableRow key={product.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => toggleProductSelection(product)}
                            aria-label={`Select ${product.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          {product.variants.length > 1 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleProductExpanded(product.id)}
                            >
                              {expandedProducts[product.id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="w-8"></div> // Empty div to maintain spacing
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.title}
                          {product.variants.length > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({product.variants.length} variants)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={isMobile ? "hidden" : ""}>
                          {product.product_type || "Uncategorized"}
                        </TableCell>
                        <TableCell className={isMobile || isTablet ? "hidden" : ""}>{product.vendor}</TableCell>
                        <TableCell className="text-right">
                          {product.variants.length === 1
                            ? formatPrice(product.variants[0].price)
                            : product.variants.length > 1
                              ? `${formatPrice(product.variants[0].price)}+`
                              : "-"}
                        </TableCell>
                        <TableCell className={`text-right ${isMobile ? "hidden" : ""}`}>
                          <span
                            className={
                              product.variants.reduce((sum, variant) => sum + variant.inventory_quantity, 0) <= 5
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {product.variants.reduce((sum, variant) => sum + variant.inventory_quantity, 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={isProductBargainingEnabled(product.id) ? "default" : "outline"}>
                            {isProductBargainingEnabled(product.id) ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setProductSettingsOpen(product.id)}>
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Edit bargaining settings</span>
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expandedProducts[product.id] && product.variants.length > 1 && (
                        <>
                          {product.variants.map((variant) => {
                            // Safely get the min_price value, ensuring it's a number
                            const variantSettings = bargainingSettings[product.id]?.[variant.id]
                            const minPrice = variantSettings?.min_price
                            const formattedMinPrice = typeof minPrice === "number" ? minPrice.toFixed(2) : "0.00"

                            return (
                              <TableRow key={variant.id} className="bg-muted/50 dark:bg-slate-800/50">
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="pl-10">
                                  {variant.title === "Default Title" ? "Default Variant" : variant.title}
                                  {variant.sku && (
                                    <span className="ml-2 text-xs text-muted-foreground">SKU: {variant.sku}</span>
                                  )}
                                  {variant.barcode && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      Barcode: {variant.barcode}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className={isMobile ? "hidden" : ""}></TableCell>
                                <TableCell className={isMobile || isTablet ? "hidden" : ""}></TableCell>
                                <TableCell className="text-right">{formatPrice(variant.price)}</TableCell>
                                <TableCell className={`text-right ${isMobile ? "hidden" : ""}`}>
                                  <span
                                    className={variant.inventory_quantity <= 5 ? "text-destructive font-medium" : ""}
                                  >
                                    {variant.inventory_quantity}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {bargainingSettings[product.id]?.[variant.id] ? (
                                    <Badge
                                      variant={
                                        bargainingSettings[product.id][variant.id].bargaining_enabled
                                          ? "default"
                                          : "outline"
                                      }
                                    >
                                      {bargainingSettings[product.id][variant.id].bargaining_enabled ? (
                                        <>
                                          Min: {getCurrencySymbol(currency)}
                                          {formattedMinPrice}
                                        </>
                                      ) : (
                                        "Disabled"
                                      )}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Not Set</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setVariantSettingsOpen({ productId: product.id, variantId: variant.id })
                                    }
                                  >
                                    <Settings className="h-4 w-4" />
                                    <span className="sr-only">Edit variant bargaining settings</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </>
                      )}
                    </>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {searchTerm ||
                      selectedCategories.length > 0 ||
                      selectedVendors.length > 0 ||
                      bargainingFilter !== "all"
                        ? "No products match your filters"
                        : "No products found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          {filteredAndSortedProducts.length > 0 && (
            <div className="flex flex-col gap-4">
              <EnhancedPagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value)
                  setCurrentPage(1) // Reset to first page when changing items per page
                }}
              />

              {selectedProducts.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Product Settings Dialog */}
      <Dialog
        open={!!productSettingsOpen}
        onOpenChange={(open) => {
          if (!open) setProductSettingsOpen(null)
        }}
      >
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[95vw] sm:max-w-[600px]">
          {productSettingsOpen && (
            <ProductBargainingSettings
              productId={productSettingsOpen}
              productTitle={products.find((p) => p.id === productSettingsOpen)?.title || ""}
              variants={products.find((p) => p.id === productSettingsOpen)?.variants || []}
              initialSettings={
                bargainingSettings[productSettingsOpen]
                  ? Object.entries(bargainingSettings[productSettingsOpen]).map(([variantId, settings]) => ({
                      variant_id: variantId,
                      ...(settings as any),
                    }))
                  : []
              }
              onSettingsChanged={handleSettingsChanged}
              onClose={() => setProductSettingsOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Variant Settings Dialog */}
      <Dialog
        open={!!variantSettingsOpen}
        onOpenChange={(open) => {
          if (!open) setVariantSettingsOpen(null)
        }}
      >
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[95vw] sm:max-w-[500px]">
          {variantSettingsOpen && (
            <VariantBargainingSettings
              productId={variantSettingsOpen.productId}
              variantId={variantSettingsOpen.variantId}
              variantTitle={
                products
                  .find((p) => p.id === variantSettingsOpen.productId)
                  ?.variants.find((v) => v.id === variantSettingsOpen.variantId)?.title || ""
              }
              originalPrice={Number.parseFloat(
                products
                  .find((p) => p.id === variantSettingsOpen.productId)
                  ?.variants.find((v) => v.id === variantSettingsOpen.variantId)?.price || "0",
              )}
              initialSettings={bargainingSettings[variantSettingsOpen.productId]?.[variantSettingsOpen.variantId]}
              onSettingsChanged={handleSettingsChanged}
              onClose={() => setVariantSettingsOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
