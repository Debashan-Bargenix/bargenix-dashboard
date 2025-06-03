"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { saveBargainingSettingsForProduct } from "@/app/actions/bargaining-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useShopifyStore } from "@/hooks/use-shopify-store"

interface ProductVariant {
  id: string
  title: string
  price: string
  inventory_quantity: number
}

interface ProductBargainingSettingsProps {
  productId: string
  productTitle: string
  variants: ProductVariant[]
  initialSettings?: Array<{
    variant_id: string
    bargaining_enabled: boolean
    min_price: number
    behavior: "low" | "normal" | "high"
  }>
  onSettingsChanged?: () => void
  onClose?: () => void
  className?: string
}

export function ProductBargainingSettings({
  productId,
  productTitle,
  variants,
  initialSettings = [],
  onSettingsChanged,
  onClose,
  className,
}: ProductBargainingSettingsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 768px)")
  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const { storeCurrency, isLoading: isLoadingStore } = useShopifyStore()

  // Check if all variants have the same settings
  const allEnabled = initialSettings.length > 0 && initialSettings.every((s) => s.bargaining_enabled)
  const anyEnabled = initialSettings.some((s) => s.bargaining_enabled)

  const [enabled, setEnabled] = useState(allEnabled)
  const [minPriceType, setMinPriceType] = useState<"fixed" | "percentage">("percentage")
  const [minPriceValue, setMinPriceValue] = useState(80) // Default to 80% of original price
  const [sliderValue, setSliderValue] = useState(80) // For the percentage slider
  const [behavior, setBehavior] = useState<"low" | "normal" | "high">("normal")
  const [activeTab, setActiveTab] = useState("settings")

  // Reset success status after 3 seconds
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        setSuccess(false)
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [success])

  // Safely format a number with toFixed
  const safeToFixed = (value: number | string | undefined, decimals = 2): string => {
    if (value === undefined || value === null) return "0.00"

    const num = typeof value === "string" ? Number.parseFloat(value) : value

    if (isNaN(num)) return "0.00"

    return num.toFixed(decimals)
  }

  // Get currency symbol based on currency code
  const getCurrencySymbol = (currencyCode: string | null = null): string => {
    const code = currencyCode || storeCurrency || "USD"

    try {
      // Use Intl.NumberFormat to get the currency symbol
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "symbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(0)
        .replace(/[0-9]/g, "")
        .trim()
    } catch (error) {
      console.error(`Error getting currency symbol for ${code}:`, error)
      return "$" // Fallback to $ if there's an error
    }
  }

  // Get currency symbol
  const currencySymbol = getCurrencySymbol()

  // Create a map of variant IDs to original prices and inventory quantities
  const originalPrices: Record<string, number> = {}
  const inventoryQuantities: Record<string, number> = {}

  variants.forEach((variant) => {
    // Ensure price is a valid number
    const price = typeof variant.price === "string" ? Number.parseFloat(variant.price) : variant.price
    originalPrices[variant.id] = isNaN(price) ? 0 : price

    // Store inventory quantity
    const quantity = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : 0
    inventoryQuantities[variant.id] = quantity
  })

  // Handle slider value change
  const handleSliderChange = (value: number[]) => {
    const percentage = value[0]
    setSliderValue(percentage)
    setMinPriceValue(percentage)
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSuccess(false)
    setError(null)

    try {
      console.log("Saving settings with:", {
        productId,
        variantIds: variants.map((v) => v.id),
        enabled,
        minPriceType,
        minPriceValue,
        originalPrices,
        inventoryQuantities,
        behavior,
      })

      // Log the exact values that will be used for each variant
      variants.forEach((variant) => {
        const originalPrice = originalPrices[variant.id] || 0
        const inventoryQuantity = inventoryQuantities[variant.id] || 0

        let minPrice = 0
        if (minPriceType === "percentage") {
          minPrice = originalPrice * (minPriceValue / 100)
        } else {
          minPrice = minPriceValue
        }
        minPrice = Math.min(minPrice, originalPrice)

        console.log(`Variant ${variant.id} (${variant.title}):`, {
          enabled,
          originalPrice,
          minPrice,
          behavior,
          inventoryQuantity,
          willBeProcessed: !(enabled && inventoryQuantity <= 0),
        })
      })

      // Check if any variants have inventory
      const hasInventory = Object.values(inventoryQuantities).some((qty) => qty > 0)

      if (enabled && !hasInventory) {
        setError("Cannot enable bargaining for products with no inventory")
        toast({
          title: "Error",
          description: "Cannot enable bargaining for products with no inventory",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const result = await saveBargainingSettingsForProduct(
        productId,
        variants.map((v) => v.id),
        enabled,
        minPriceType,
        minPriceValue,
        originalPrices,
        behavior,
        inventoryQuantities,
      )

      console.log("Save result:", result)

      if (result.success) {
        setSuccess(true)
        toast({
          title: "Settings saved",
          description: `Bargaining settings for ${productTitle} have been updated.`,
        })

        if (onSettingsChanged) {
          onSettingsChanged()
        }

        // Auto close after successful save if on mobile
        if (isMobile && onClose) {
          setTimeout(() => {
            onClose()
          }, 1500)
        }
      } else {
        setError(result.error || result.message || "Failed to save settings")
        toast({
          title: "Error",
          description: result.message || "Failed to save settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in handleSave:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate preview values for each variant
  const previewValues = variants.map((variant) => {
    // Ensure price is a valid number
    const originalPrice = typeof variant.price === "string" ? Number.parseFloat(variant.price) : variant.price
    const safeOriginalPrice = isNaN(originalPrice) ? 0 : originalPrice
    const inventoryQuantity = variant.inventory_quantity || 0

    let minPrice = 0

    if (minPriceType === "fixed") {
      minPrice = Math.min(minPriceValue, safeOriginalPrice)
    } else {
      minPrice = Math.min(safeOriginalPrice * (minPriceValue / 100), safeOriginalPrice)
    }

    // Ensure all calculated values are valid numbers
    const safeMinPrice = isNaN(minPrice) ? 0 : minPrice
    const discount = safeOriginalPrice - safeMinPrice
    const discountPercentage = safeOriginalPrice > 0 ? 100 - (safeMinPrice / safeOriginalPrice) * 100 : 0

    return {
      variantId: variant.id,
      variantTitle: variant.title === "Default Title" ? "Default Variant" : variant.title,
      originalPrice: safeOriginalPrice,
      minPrice: safeMinPrice,
      discount: discount,
      discountPercentage: discountPercentage,
      inventoryQuantity: inventoryQuantity,
      canEnableBargaining: inventoryQuantity > 0,
    }
  })

  // Check if any variants have inventory
  const hasInventory = previewValues.some((preview) => preview.inventoryQuantity > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
      <Card
        className={cn(
          "w-full mx-auto flex flex-col bg-white dark:bg-slate-900 border dark:border-slate-700",
          isLargeScreen ? "max-w-2xl" : "max-w-full",
          isMobile ? "max-h-[90vh]" : "max-h-[80vh]",
          className,
        )}
      >
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between space-y-0 gap-4 border-b dark:border-slate-700 shrink-0">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap text-slate-900 dark:text-slate-100">
              <span className="truncate max-w-[150px] sm:max-w-[250px] md:max-w-none">{productTitle}</span>
              {success && (
                <span className="flex items-center text-green-600 dark:text-green-500 text-xs sm:text-sm">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Saved
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1 text-slate-500 dark:text-slate-400">
              Configure bargaining settings
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="px-4 py-2 sm:px-6 sm:py-4 overflow-y-auto flex-grow">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-3 sm:mb-4 w-full bg-slate-100 dark:bg-slate-800">
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
              >
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-3 sm:space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-3 py-2 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20"
                >
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-500" />
                  <AlertTitle className="text-xs sm:text-sm text-red-600 dark:text-red-500">Error</AlertTitle>
                  <AlertDescription className="text-xs text-red-600 dark:text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {!hasInventory && (
                <Alert
                  variant="warning"
                  className="mb-3 py-2 border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                >
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-500" />
                  <AlertTitle className="text-xs sm:text-sm text-amber-600 dark:text-amber-500">
                    No Inventory
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                    This product has no inventory. Bargaining can only be enabled for products with inventory.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`enable-bargaining-${productId}`}
                  className="font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                >
                  Enable Bargaining for All Variants
                </Label>
                <Switch
                  id={`enable-bargaining-${productId}`}
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  disabled={isLoading || !hasInventory}
                  className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                />
              </div>

              {enabled && (
                <div className="space-y-3 sm:space-y-4 mt-2">
                  <div className="grid gap-2 sm:gap-3">
                    <div className="grid gap-1 sm:gap-2">
                      <Label className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        Minimum Price Type
                      </Label>
                      <Tabs
                        value={minPriceType}
                        onValueChange={(value) => setMinPriceType(value as "fixed" | "percentage")}
                        className="w-full"
                        disabled={!enabled || isLoading}
                      >
                        <TabsList className="grid grid-cols-2 w-full h-8 bg-slate-100 dark:bg-slate-800">
                          <TabsTrigger
                            value="percentage"
                            className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
                          >
                            Percentage
                          </TabsTrigger>
                          <TabsTrigger
                            value="fixed"
                            className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
                          >
                            Fixed Amount
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {minPriceType === "percentage" ? (
                      <div className="grid gap-1 sm:gap-2">
                        <Label
                          htmlFor={`min-price-${productId}`}
                          className="text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                        >
                          Minimum Price Percentage: {sliderValue}%
                        </Label>
                        <Slider
                          value={[sliderValue]}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={handleSliderChange}
                          disabled={!enabled || isLoading}
                          className="py-1"
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>1%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Customers can bargain down to {sliderValue}% of the original price
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-1 sm:gap-2">
                        <Label
                          htmlFor={`min-price-${productId}`}
                          className="text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                        >
                          Minimum Price Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                            {currencySymbol}
                          </span>
                          <Input
                            id={`min-price-${productId}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={minPriceValue}
                            onChange={(e) => {
                              const value = e.target.value
                              setMinPriceValue(value === "" ? 0 : Number(value))
                            }}
                            disabled={!enabled || isLoading}
                            className="pl-8 h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Customers can bargain down to {currencySymbol}
                          {safeToFixed(minPriceValue)}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-1 sm:gap-2">
                      <Label
                        htmlFor={`behavior-${productId}`}
                        className="text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                      >
                        Bargaining Behavior
                      </Label>
                      <Select
                        value={behavior}
                        onValueChange={(value) => setBehavior(value as "low" | "normal" | "high")}
                        disabled={!enabled || isLoading}
                      >
                        <SelectTrigger
                          id={`behavior-${productId}`}
                          className="h-8 text-xs sm:text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <SelectValue placeholder="Select behavior" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <SelectItem value="low" className="text-xs sm:text-sm">
                            Low (More likely to accept offers)
                          </SelectItem>
                          <SelectItem value="normal" className="text-xs sm:text-sm">
                            Normal (Balanced)
                          </SelectItem>
                          <SelectItem value="high" className="text-xs sm:text-sm">
                            High (Less likely to accept offers)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {behavior === "low"
                          ? "The system will be more generous in accepting customer offers"
                          : behavior === "high"
                            ? "The system will be more strict in accepting customer offers"
                            : "The system will have a balanced approach to accepting offers"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-3 sm:space-y-4 pb-4">
              {variants.length > 0 && (
                <div className="grid gap-2">
                  <div className="border dark:border-slate-700 rounded-md overflow-x-auto max-h-[30vh]">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        <tr>
                          <th className="px-2 py-1 text-left sm:px-3 sm:py-2">{isMobile ? "Var." : "Variant"}</th>
                          <th className="px-2 py-1 text-right sm:px-3 sm:py-2">{isMobile ? "Orig." : "Original"}</th>
                          <th className="px-2 py-1 text-right sm:px-3 sm:py-2">{isMobile ? "Min" : "Min Price"}</th>
                          <th className="px-2 py-1 text-right sm:px-3 sm:py-2">Discount</th>
                          <th className="px-2 py-1 text-right sm:px-3 sm:py-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {previewValues.map((preview) => (
                          <tr
                            key={preview.variantId}
                            className="border-t dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          >
                            <td className="px-2 py-1 sm:px-3 sm:py-2">
                              <span className="truncate block max-w-[60px] sm:max-w-[120px] md:max-w-[180px]">
                                {preview.variantTitle}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-right sm:px-3 sm:py-2">
                              {currencySymbol}
                              {safeToFixed(preview.originalPrice)}
                            </td>
                            <td className="px-2 py-1 text-right sm:px-3 sm:py-2">
                              {enabled && preview.canEnableBargaining ? (
                                <span className="font-medium">
                                  {currencySymbol}
                                  {safeToFixed(preview.minPrice)}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-right sm:px-3 sm:py-2">
                              {enabled && preview.canEnableBargaining ? (
                                <span className="text-green-600 dark:text-green-500">
                                  {currencySymbol}
                                  {safeToFixed(preview.discount)}{" "}
                                  {!isMobile && `(${Math.round(preview.discountPercentage)}%)`}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-right sm:px-3 sm:py-2">
                              <span
                                className={
                                  preview.inventoryQuantity > 0
                                    ? "text-green-600 dark:text-green-500"
                                    : "text-red-600 dark:text-red-500"
                                }
                              >
                                {preview.inventoryQuantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Alert
                    variant="outline"
                    className="py-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400" />
                    <AlertDescription className="text-xs text-slate-700 dark:text-slate-300">
                      {enabled
                        ? "These settings will be applied to all in-stock variants of this product when you save."
                        : "Bargaining will be disabled for all variants of this product when you save."}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end gap-2 shrink-0">
          {onClose && (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={onClose}
              className="h-9 px-4 text-xs sm:text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isLoading || (enabled && !hasInventory)}
            variant={enabled ? "default" : "outline"}
            size={isMobile ? "sm" : "default"}
            className={cn(
              "h-9 px-4 text-xs sm:text-sm",
              enabled
                ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            {isLoading && <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
            {enabled ? "Save Settings" : "Disable Bargaining"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
