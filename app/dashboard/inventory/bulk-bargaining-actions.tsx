"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bulkUpdateBargainingSettings } from "@/app/actions/bargaining-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Settings2, CheckCircle, XCircle, DollarSign, Percent, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ProductVariant {
  id: string
  title: string
  price: string
  inventory_quantity: number
}

interface Product {
  id: string
  title: string
  variants: ProductVariant[]
}

interface BulkBargainingActionsProps {
  selectedProducts: Product[]
  onSettingsChanged?: () => void
}

export function BulkBargainingActions({ selectedProducts, onSettingsChanged }: BulkBargainingActionsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"quick" | "advanced">("quick")

  // Quick actions state
  const [quickAction, setQuickAction] = useState<"enable" | "disable">("enable")

  // Advanced settings state
  const [enabled, setEnabled] = useState(true)
  const [minPriceType, setMinPriceType] = useState<"fixed" | "percentage">("percentage")
  const [minPriceValue, setMinPriceValue] = useState(80) // Default to 80% of original price
  const [behavior, setBehavior] = useState<"low" | "normal" | "high">("normal")

  // Calculate stats for selected products
  const totalProducts = selectedProducts.length
  const productsWithInventory = selectedProducts.filter((product) =>
    product.variants.some((variant) => variant.inventory_quantity > 0),
  ).length

  const totalVariants = selectedProducts.reduce((sum, product) => sum + product.variants.length, 0)
  const variantsWithInventory = selectedProducts.reduce((sum, product) => {
    return sum + product.variants.filter((variant) => variant.inventory_quantity > 0).length
  }, 0)

  const handleQuickAction = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to apply settings.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create settings for each product
      const productSettings = selectedProducts.map((product) => {
        // Create a map of variant IDs to original prices and inventory quantities
        const originalPrices = {}
        const inventoryQuantities = {}

        product.variants.forEach((variant) => {
          originalPrices[variant.id] = Number.parseFloat(variant.price)
          inventoryQuantities[variant.id] = variant.inventory_quantity
        })

        return {
          productId: product.id,
          variantIds: product.variants.map((v) => v.id),
          enabled: quickAction === "enable",
          minPriceType: "percentage",
          minPriceValue: 80, // Default to 80% of original price
          originalPrices,
          inventoryQuantities,
          behavior: "normal",
        }
      })

      const result = await bulkUpdateBargainingSettings(productSettings)

      if (result.success) {
        toast({
          title: quickAction === "enable" ? "Bargaining Enabled" : "Bargaining Disabled",
          description: `Bargaining has been ${quickAction === "enable" ? "enabled" : "disabled"} for ${selectedProducts.length} products.`,
        })

        if (onSettingsChanged) {
          onSettingsChanged()
        }

        setIsOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error || result.message || `Failed to ${quickAction} bargaining`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdvancedApply = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to apply settings.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create settings for each product
      const productSettings = selectedProducts.map((product) => {
        // Create a map of variant IDs to original prices and inventory quantities
        const originalPrices = {}
        const inventoryQuantities = {}

        product.variants.forEach((variant) => {
          originalPrices[variant.id] = Number.parseFloat(variant.price)
          inventoryQuantities[variant.id] = variant.inventory_quantity
        })

        return {
          productId: product.id,
          variantIds: product.variants.map((v) => v.id),
          enabled,
          minPriceType,
          minPriceValue,
          originalPrices,
          inventoryQuantities,
          behavior,
        }
      })

      const result = await bulkUpdateBargainingSettings(productSettings)

      if (result.success) {
        toast({
          title: "Settings applied",
          description: `Bargaining settings for ${selectedProducts.length} products have been updated.`,
        })

        if (onSettingsChanged) {
          onSettingsChanged()
        }

        setIsOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to apply settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate estimated discount based on settings
  const getEstimatedDiscount = () => {
    if (minPriceType === "percentage") {
      return `${100 - minPriceValue}%`
    } else {
      // Calculate average price of all variants
      let totalPrice = 0
      let totalVariants = 0

      selectedProducts.forEach((product) => {
        product.variants.forEach((variant) => {
          totalPrice += Number.parseFloat(variant.price)
          totalVariants++
        })
      })

      const avgPrice = totalPrice / totalVariants
      const avgDiscount = avgPrice - minPriceValue
      const avgDiscountPercent = (avgDiscount / avgPrice) * 100

      return `~${avgDiscountPercent.toFixed(0)}% ($${minPriceValue.toFixed(2)})`
    }
  }

  // Get behavior description
  const getBehaviorDescription = () => {
    switch (behavior) {
      case "low":
        return "More likely to accept customer offers (customer-friendly)"
      case "normal":
        return "Balanced negotiation approach"
      case "high":
        return "Less likely to accept offers (profit-focused)"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Bulk Bargaining Settings
          {selectedProducts.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {selectedProducts.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-background z-10 border-b">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Bulk Bargaining Settings</DialogTitle>
            <DialogDescription>
              Apply bargaining settings to {selectedProducts.length} selected products. This will override any existing
              settings for these products.
            </DialogDescription>
          </DialogHeader>
        </div>

        {selectedProducts.length === 0 ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No products selected</AlertTitle>
              <AlertDescription>
                Please select at least one product from the table to apply bulk bargaining settings.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            <div className="p-6 pt-2 space-y-6">
              {/* Product selection summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalProducts}</div>
                      <div className="text-sm text-muted-foreground">Products Selected</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalVariants}</div>
                      <div className="text-sm text-muted-foreground">Total Variants</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {productsWithInventory < totalProducts && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Inventory Warning</AlertTitle>
                  <AlertDescription className="text-sm">
                    {productsWithInventory === 0
                      ? "None of the selected products have inventory. Bargaining can only be enabled for products with inventory."
                      : `${totalProducts - productsWithInventory} of ${totalProducts} selected products have no inventory. Bargaining will only be enabled for products with inventory.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabs for quick vs advanced settings */}
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "quick" | "advanced")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="quick">Quick Actions</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                </TabsList>

                {activeTab === "quick" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                          variant={quickAction === "enable" ? "default" : "outline"}
                          className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
                          onClick={() => setQuickAction("enable")}
                        >
                          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                          <div>Enable Bargaining</div>
                        </Button>
                        <Button
                          variant={quickAction === "disable" ? "default" : "outline"}
                          className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
                          onClick={() => setQuickAction("disable")}
                        >
                          <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                          <div>Disable Bargaining</div>
                        </Button>
                      </div>

                      <Alert className="mt-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Quick Action Info</AlertTitle>
                        <AlertDescription className="text-sm">
                          {quickAction === "enable"
                            ? "This will enable bargaining for all selected products with inventory. Default settings will use 80% of original price as minimum price."
                            : "This will disable bargaining for all selected products and their variants."}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}

                {activeTab === "advanced" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable-bargaining-bulk" className="font-medium">
                        Enable Bargaining
                      </Label>
                      <Switch
                        id="enable-bargaining-bulk"
                        checked={enabled}
                        onCheckedChange={setEnabled}
                        disabled={isLoading}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Minimum Price Type</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="left" align="center" className="max-w-[200px]">
                              <p>Choose how to calculate the minimum price for bargaining</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <Tabs
                        value={minPriceType}
                        onValueChange={(value) => setMinPriceType(value as "fixed" | "percentage")}
                        className="w-full"
                        disabled={!enabled || isLoading}
                      >
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="percentage" className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            <span className="hidden xs:inline">Percentage</span>
                            <span className="xs:hidden">%</span>
                          </TabsTrigger>
                          <TabsTrigger value="fixed" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="hidden xs:inline">Fixed Amount</span>
                            <span className="xs:hidden">Fixed</span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="min-price-bulk" className="font-medium">
                          {minPriceType === "percentage" ? "Minimum Price Percentage" : "Minimum Price Amount"}
                        </Label>
                        <span className="text-sm font-medium">
                          {minPriceType === "percentage" ? `${minPriceValue}%` : `$${minPriceValue.toFixed(2)}`}
                        </span>
                      </div>

                      <Slider
                        id="min-price-bulk"
                        min={minPriceType === "percentage" ? 1 : 0}
                        max={minPriceType === "percentage" ? 100 : 1000}
                        step={minPriceType === "percentage" ? 1 : 0.5}
                        value={[minPriceValue]}
                        onValueChange={(values) => setMinPriceValue(values[0])}
                        disabled={!enabled || isLoading}
                        className="py-4"
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="relative">
                          <Input
                            type="number"
                            min={minPriceType === "percentage" ? 1 : 0}
                            max={minPriceType === "percentage" ? 100 : undefined}
                            step={minPriceType === "percentage" ? 1 : 0.01}
                            value={minPriceValue}
                            onChange={(e) => setMinPriceValue(Number.parseFloat(e.target.value))}
                            disabled={!enabled || isLoading}
                            className={`${minPriceType === "percentage" ? "pr-8" : "pl-8"} w-24`}
                          />
                          {minPriceType === "percentage" ? (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-muted-foreground">%</span>
                            </div>
                          ) : (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-muted-foreground">$</span>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">Max discount: {getEstimatedDiscount()}</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="behavior-bulk" className="font-medium">
                          Bargaining Behavior
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="left" align="center" className="max-w-[200px]">
                              <p>Controls how likely the system is to accept customer offers</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <Select
                        value={behavior}
                        onValueChange={(value) => setBehavior(value as "low" | "normal" | "high")}
                        disabled={!enabled || isLoading}
                      >
                        <SelectTrigger id="behavior-bulk">
                          <SelectValue placeholder="Select behavior" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (More likely to accept offers)</SelectItem>
                          <SelectItem value="normal">Normal (Balanced)</SelectItem>
                          <SelectItem value="high">High (Less likely to accept offers)</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="text-sm text-muted-foreground">{getBehaviorDescription()}</div>
                    </div>
                  </div>
                )}
              </Tabs>
            </div>

            <div className="sticky bottom-0 bg-background border-t p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={activeTab === "quick" ? handleQuickAction : handleAdvancedApply}
                disabled={isLoading || selectedProducts.length === 0}
                className="w-full sm:w-auto"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeTab === "quick"
                  ? quickAction === "enable"
                    ? "Enable Bargaining"
                    : "Disable Bargaining"
                  : "Apply Advanced Settings"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
