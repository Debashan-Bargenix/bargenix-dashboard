"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { saveBargainingSettings } from "@/app/actions/bargaining-actions"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Info, Loader2, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useShopifyStore } from "@/hooks/use-shopify-store"

interface VariantBargainingSettingsProps {
  productId: string
  variantId: string
  variantTitle: string
  originalPrice: number
  inventoryQuantity: number
  initialSettings?: {
    bargaining_enabled: boolean
    min_price: number
    behavior: "low" | "normal" | "high"
  }
  onSettingsChanged?: () => void
  onClose?: () => void
  className?: string
}

export function VariantBargainingSettings({
  productId,
  variantId,
  variantTitle,
  originalPrice,
  inventoryQuantity,
  initialSettings,
  onSettingsChanged,
  onClose,
  className,
}: VariantBargainingSettingsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const { storeCurrency, isLoading: isLoadingStore } = useShopifyStore()

  // Ensure originalPrice is a valid number
  const safeOriginalPrice = typeof originalPrice === "number" && !isNaN(originalPrice) ? originalPrice : 0

  // Calculate default min price (80% of original price)
  const defaultMinPrice = Math.floor(safeOriginalPrice * 0.8 * 100) / 100

  const [enabled, setEnabled] = useState(initialSettings?.bargaining_enabled || false)
  const [minPrice, setMinPrice] = useState(
    initialSettings?.min_price !== undefined ? Number(initialSettings.min_price) : defaultMinPrice,
  )
  const [behavior, setBehavior] = useState<"low" | "normal" | "high">(initialSettings?.behavior || "normal")
  const [activeTab, setActiveTab] = useState<"input" | "slider">("input")

  // Calculate percentage of original price
  const percentage = safeOriginalPrice > 0 ? Math.round((minPrice / safeOriginalPrice) * 100) : 0

  // Check if variant has inventory
  const hasInventory = inventoryQuantity > 0

  // Reset success status after 3 seconds
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        setSuccess(false)
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [success])

  // Update minPrice when slider percentage changes
  const handlePercentageChange = (value: number[]) => {
    const newPercentage = value[0]
    setMinPrice(Number((safeOriginalPrice * (newPercentage / 100)).toFixed(2)))
  }

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

  // Ensure min price is not higher than original price
  useEffect(() => {
    if (minPrice > safeOriginalPrice) {
      setMinPrice(safeOriginalPrice)
    }
  }, [minPrice, safeOriginalPrice])

  const handleSave = async () => {
    setIsLoading(true)
    setSuccess(false)
    setError(null)

    try {
      // Check if inventory is 0 and trying to enable bargaining
      if (enabled && !hasInventory) {
        setError("Cannot enable bargaining for out-of-stock items")
        toast({
          title: "Error",
          description: "Cannot enable bargaining for out-of-stock items",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Ensure min price is not higher than original price
      const finalMinPrice = Math.min(minPrice, safeOriginalPrice)

      console.log("Saving variant settings:", {
        productId,
        variantId,
        enabled,
        minPrice: finalMinPrice,
        originalPrice: safeOriginalPrice,
        behavior,
        inventoryQuantity,
      })

      const result = await saveBargainingSettings(
        productId,
        variantId,
        enabled,
        finalMinPrice,
        safeOriginalPrice,
        behavior,
        inventoryQuantity,
      )

      console.log("Save result:", result)

      if (result.success) {
        setSuccess(true)
        toast({
          title: "Settings saved",
          description: `Bargaining settings for ${variantTitle} have been updated.`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
      <Card
        className={cn(
          "w-full mx-auto flex flex-col bg-white dark:bg-slate-900 border dark:border-slate-700",
          isLargeScreen ? "max-w-md" : "max-w-full",
          isMobile ? "max-h-[90vh]" : "max-h-[80vh]",
          className,
        )}
      >
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between space-y-0 gap-4 border-b dark:border-slate-700 shrink-0">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap text-slate-900 dark:text-slate-100">
              <span className="truncate max-w-[150px] sm:max-w-[250px] md:max-w-none">{variantTitle}</span>
              {success && (
                <span className="flex items-center text-green-600 dark:text-green-500 text-xs sm:text-sm">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Saved
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1 text-slate-500 dark:text-slate-400">
              Configure variant bargaining settings
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
          <div className="space-y-3 sm:space-y-4 pb-4">
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
                <AlertTitle className="text-xs sm:text-sm text-amber-600 dark:text-amber-500">No Inventory</AlertTitle>
                <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                  This variant has no inventory. Bargaining can only be enabled for variants with inventory.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <Label
                htmlFor={`enable-bargaining-${variantId}`}
                className="font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              >
                Enable Bargaining
              </Label>
              <Switch
                id={`enable-bargaining-${variantId}`}
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={isLoading || !hasInventory}
                className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
              />
            </div>

            {enabled && (
              <>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "slider")} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-3 sm:mb-4 w-full h-8 bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger
                      value="input"
                      className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
                    >
                      Direct Input
                    </TabsTrigger>
                    <TabsTrigger
                      value="slider"
                      className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:text-slate-300 dark:data-[state=inactive]:text-slate-400"
                    >
                      Percentage Slider
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="input" className="space-y-3 sm:space-y-4">
                    <div className="grid gap-1 sm:gap-2">
                      <Label
                        htmlFor={`min-price-${variantId}`}
                        className="text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                      >
                        Minimum Price (Original: {currencySymbol}
                        {safeToFixed(safeOriginalPrice)})
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                          {currencySymbol}
                        </span>
                        <Input
                          id={`min-price-${variantId}`}
                          type="number"
                          min={0}
                          max={safeOriginalPrice}
                          step={0.01}
                          value={minPrice}
                          onChange={(e) => {
                            const value = e.target.value
                            const newPrice = value === "" ? 0 : Number(value)
                            // Ensure min price is not higher than original price
                            setMinPrice(Math.min(newPrice, safeOriginalPrice))
                          }}
                          disabled={!enabled || isLoading}
                          className="pl-8 h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {minPrice > 0 && safeOriginalPrice > 0 && (
                          <>
                            {percentage}% of original price ({currencySymbol}
                            {safeToFixed(safeOriginalPrice - minPrice)} discount)
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="slider" className="space-y-3 sm:space-y-4">
                    <div className="grid gap-1 sm:gap-2">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          Percentage: {percentage}%
                        </Label>
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {currencySymbol}
                          {safeToFixed(minPrice)}
                        </span>
                      </div>
                      <Slider
                        value={[percentage]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={handlePercentageChange}
                        disabled={!enabled || isLoading}
                        className="py-1"
                      />
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>1%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Customers can bargain down to {percentage}% of the original price ({currencySymbol}
                        {safeToFixed(safeOriginalPrice - minPrice)} discount)
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid gap-1 sm:gap-2">
                  <Label
                    htmlFor={`behavior-${variantId}`}
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
                      id={`behavior-${variantId}`}
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

                <Alert
                  variant="outline"
                  className="py-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                >
                  <Info className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400" />
                  <AlertDescription className="text-xs text-slate-700 dark:text-slate-300">
                    Setting a lower minimum price will increase the chance of sales but may reduce your profit margin.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
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
            className={cn(
              "h-9 px-4 text-xs sm:text-sm",
              "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700",
            )}
            size={isMobile ? "sm" : "default"}
          >
            {isLoading && <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
