"use client"

import { useState } from "react"
import { Loader2, Save, AlertCircle, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { updateBulkBargainingSettings } from "@/app/actions/bargaining-actions"

export function GlobalBargainingSettings() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [minPricePercentage, setMinPricePercentage] = useState(80)
  const [category, setCategory] = useState<string>("all")
  const [limitType, setLimitType] = useState<string>("all")
  const [maxProducts, setMaxProducts] = useState<number>(10)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const categories = [
    { id: "all", name: "All Categories" },
    { id: "snowboard", name: "Snowboard" },
    { id: "ski", name: "Ski" },
    { id: "apparel", name: "Apparel" },
    { id: "accessories", name: "Accessories" },
  ]

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const result = await updateBulkBargainingSettings({
        isEnabled,
        minPricePercentage,
        category: category === "all" ? null : category,
        limitType,
        maxProducts: limitType === "all" ? null : maxProducts,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setSuccess(true)
      toast({
        title: "Settings saved",
        description: `Bargaining settings updated for ${result.updatedCount || 0} products`,
        variant: "default",
      })

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update bargaining settings")
      toast({
        title: "Error",
        description: err.message || "Failed to update bargaining settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Bargaining Settings</CardTitle>
        <CardDescription>Apply bargaining settings to multiple products at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              Bargaining settings have been updated successfully
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="bargaining-enabled">Enable Bargaining</Label>
            <div className="text-sm text-muted-foreground">Allow customers to negotiate prices</div>
          </div>
          <Switch id="bargaining-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} disabled={isLoading} />
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="min-price-percentage">Minimum Price ({minPricePercentage}%)</Label>
            <div className="text-sm text-muted-foreground">
              The lowest price you're willing to accept as a percentage of the original price
            </div>
          </div>
          <Slider
            id="min-price-percentage"
            defaultValue={[minPricePercentage]}
            max={100}
            min={50}
            step={1}
            onValueChange={(values) => setMinPricePercentage(values[0])}
            disabled={isLoading}
            className="py-4"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="category-select">Apply to Category</Label>
          <Select value={category} onValueChange={setCategory} disabled={isLoading}>
            <SelectTrigger id="category-select" className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="limit-type">Product Limit</Label>
          <Select value={limitType} onValueChange={setLimitType} disabled={isLoading}>
            <SelectTrigger id="limit-type" className="w-full">
              <SelectValue placeholder="Select limit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Apply to all products</SelectItem>
              <SelectItem value="limited">Apply to limited number of products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {limitType === "limited" && (
          <div className="space-y-3">
            <Label htmlFor="max-products">Maximum Products</Label>
            <Select
              value={String(maxProducts)}
              onValueChange={(value) => setMaxProducts(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger id="max-products" className="w-full">
                <SelectValue placeholder="Select maximum products" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} products
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
