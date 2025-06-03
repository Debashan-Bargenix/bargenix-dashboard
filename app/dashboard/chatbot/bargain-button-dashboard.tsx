"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, X, ExternalLink, Save, Wand2, Zap } from "lucide-react"
import {
  installBargainButton,
  uninstallBargainButton,
  checkBargainButtonStatus,
} from "@/app/actions/bargain-button-actions"
import { getButtonCustomization, updateButtonCustomization } from "@/app/actions/button-customization-actions"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ButtonTextOptions } from "./button-text-options"

interface BargainButtonDashboardProps {
  shopDomain: string
}

// Predefined options for easier customization
const borderRadiusOptions = [
  { value: "0", label: "Square (0px)" },
  { value: "4px", label: "Slight Rounded (4px)" },
  { value: "8px", label: "Rounded (8px)" },
  { value: "12px", label: "More Rounded (12px)" },
  { value: "16px", label: "Very Rounded (16px)" },
  { value: "9999px", label: "Pill Shape" },
]

const fontSizeOptions = [
  { value: "12px", label: "Small (12px)" },
  { value: "14px", label: "Medium (14px)" },
  { value: "16px", label: "Large (16px)" },
  { value: "18px", label: "Extra Large (18px)" },
]

const paddingOptions = [
  { value: "6px 12px", label: "Compact" },
  { value: "8px 16px", label: "Standard" },
  { value: "10px 20px", label: "Comfortable" },
  { value: "12px 24px", label: "Spacious" },
  { value: "16px 32px", label: "Very Spacious" },
]

const buttonColorPresets = [
  { value: "#4F46E5", label: "Indigo", color: "#4F46E5" },
  { value: "#2563EB", label: "Blue", color: "#2563EB" },
  { value: "#10B981", label: "Green", color: "#10B981" },
  { value: "#F59E0B", label: "Amber", color: "#F59E0B" },
  { value: "#EF4444", label: "Red", color: "#EF4444" },
  { value: "#8B5CF6", label: "Purple", color: "#8B5CF6" },
  { value: "#EC4899", label: "Pink", color: "#EC4899" },
  { value: "#000000", label: "Black", color: "#000000" },
]

const textColorPresets = [
  { value: "#FFFFFF", label: "White", color: "#FFFFFF" },
  { value: "#F3F4F6", label: "Light Gray", color: "#F3F4F6" },
  { value: "#111827", label: "Dark Gray", color: "#111827" },
  { value: "#000000", label: "Black", color: "#000000" },
]

export function BargainButtonDashboard({ shopDomain }: BargainButtonDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [installed, setInstalled] = useState(false)
  const [scripts, setScripts] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savingCustomization, setSavingCustomization] = useState(false)
  const [customization, setCustomization] = useState({
    buttonText: "Bargain a Deal",
    buttonPosition: "after-buy-button",
    buttonColor: "#4F46E5",
    textColor: "#FFFFFF",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "10px 15px",
    smartMode: true,
    customCss: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    if (shopDomain) {
      checkStatus()
      loadCustomization()
    } else {
      setChecking(false)
    }
  }, [shopDomain])

  const checkStatus = async () => {
    if (!shopDomain) {
      setChecking(false)
      return
    }

    setChecking(true)
    setError(null)
    try {
      const result = await checkBargainButtonStatus(shopDomain)
      setInstalled(result.installed)
      setScripts(result.scripts || [])
    } catch (error) {
      console.error("Error checking status:", error)
      setError("Failed to check installation status")
    } finally {
      setChecking(false)
    }
  }

  const loadCustomization = async () => {
    if (!shopDomain) return

    try {
      const result = await getButtonCustomization(shopDomain)
      if (result.success && result.settings) {
        setCustomization({
          buttonText: result.settings.button_text || "Bargain a Deal",
          buttonPosition: result.settings.button_position || "after-buy-button",
          buttonColor: result.settings.button_color || "#4F46E5",
          textColor: result.settings.text_color || "#FFFFFF",
          borderRadius: result.settings.border_radius || "8px",
          fontSize: result.settings.font_size || "14px",
          padding: result.settings.padding || "10px 15px",
          smartMode: result.settings.smart_mode !== undefined ? result.settings.smart_mode : true,
          customCss: result.settings.custom_css || "",
        })
      }
    } catch (error) {
      console.error("Error loading customization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load button customization settings",
      })
    }
  }

  const handleInstall = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await installBargainButton(shopDomain)
      if (result.success) {
        toast({
          title: "Success",
          description: "Bargain button installed successfully",
        })
        setInstalled(true)
        await checkStatus()
      } else {
        setError(result.error || "Failed to install bargain button")
        toast({
          variant: "destructive",
          title: "Installation failed",
          description: result.error || "Failed to install bargain button",
        })
      }
    } catch (error) {
      console.error("Error installing:", error)
      setError("An unexpected error occurred during installation")
      toast({
        variant: "destructive",
        title: "Installation failed",
        description: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUninstall = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await uninstallBargainButton(shopDomain)
      if (result.success) {
        toast({
          title: "Success",
          description: "Bargain button uninstalled successfully",
        })
        setInstalled(false)
        await checkStatus()
      } else {
        setError(result.error || "Failed to uninstall bargain button")
        toast({
          variant: "destructive",
          title: "Uninstallation failed",
          description: result.error || "Failed to uninstall bargain button",
        })
      }
    } catch (error) {
      console.error("Error uninstalling:", error)
      setError("An unexpected error occurred during uninstallation")
      toast({
        variant: "destructive",
        title: "Uninstallation failed",
        description: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCustomizationChange = (field: string, value: any) => {
    setCustomization((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveCustomization = async () => {
    setSavingCustomization(true)
    try {
      const result = await updateButtonCustomization(shopDomain, customization)
      if (result.success) {
        toast({
          title: "Success",
          description: "Button customization saved successfully",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to save button customization",
        })
      }
    } catch (error) {
      console.error("Error saving customization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while saving customization",
      })
    } finally {
      setSavingCustomization(false)
    }
  }

  const dismissError = () => {
    setError(null)
  }

  const openStorefront = () => {
    window.open(`https://${shopDomain}/collections/all`, "_blank")
  }

  const getButtonPreviewStyle = () => {
    return {
      backgroundColor: customization.buttonColor,
      color: customization.textColor,
      borderRadius: customization.borderRadius,
      fontSize: customization.fontSize,
      padding: customization.padding,
      width: "100%",
      border: "none",
      cursor: "pointer",
      fontWeight: 500,
      textAlign: "center" as const,
      marginTop: "10px",
    }
  }

  if (!shopDomain) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Shopify store connected</AlertTitle>
        <AlertDescription>Please connect your Shopify store before installing the bargain button.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Tabs defaultValue="installation">
      <TabsList className="mb-4">
        <TabsTrigger value="installation">Installation Status</TabsTrigger>
        <TabsTrigger value="appearance">Button Appearance</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
        <TabsTrigger value="manual">Manual Setup</TabsTrigger>
        <TabsTrigger value="testing">Testing</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={dismissError}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <TabsContent value="installation">
        <Card>
          <CardHeader>
            <CardTitle>Installation Status</CardTitle>
            <CardDescription>Manage the bargain button script installation on your Shopify store</CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Checking installation status...</span>
              </div>
            ) : installed ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Bargain button is installed</AlertTitle>
                <AlertDescription className="text-green-700">
                  The bargain button is active on your product pages.
                  {scripts.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Script details:</p>
                      <p className="text-xs mt-1">Source: {scripts[0].src}</p>
                      <p className="text-xs">Installed on: {new Date(scripts[0].created_at).toLocaleString()}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Script not installed</AlertTitle>
                <AlertDescription>
                  The bargain button script is not currently installed on your Shopify store.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={checkStatus} disabled={checking || loading}>
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </>
              )}
            </Button>
            {installed ? (
              <Button variant="destructive" onClick={handleUninstall} disabled={checking || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uninstalling...
                  </>
                ) : (
                  "Uninstall Script"
                )}
              </Button>
            ) : (
              <Button onClick={handleInstall} disabled={checking || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  "Install Script"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wand2 className="h-5 w-5 mr-2" />
              Button Appearance
            </CardTitle>
            <CardDescription>Customize how the bargain button looks on your Shopify store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="text-base text-blue-800 flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-blue-600" />
                    AI Smart Customization
                  </Label>
                  <p className="text-sm text-blue-700">
                    Automatically match your theme's button style using AI detection
                  </p>
                </div>
                <Switch
                  checked={customization.smartMode}
                  onCheckedChange={(checked) => handleCustomizationChange("smartMode", checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <ButtonTextOptions shopDomain={shopDomain} initialText={customization.buttonText} />

                <div>
                  <Label htmlFor="buttonPosition">Button Position</Label>
                  <Select
                    value={customization.buttonPosition}
                    onValueChange={(value) => handleCustomizationChange("buttonPosition", value)}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after-buy-button">After Buy it now Button</SelectItem>
                      <SelectItem value="after-add-to-cart">After Add to Cart Button</SelectItem>
                      <SelectItem value="before-buy-button">Before Buy it now Button</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buttonColor">Button Color</Label>
                    <div className="flex mt-1">
                      <input
                        id="buttonColor"
                        type="color"
                        className="h-10 w-10 border rounded"
                        value={customization.buttonColor}
                        onChange={(e) => handleCustomizationChange("buttonColor", e.target.value)}
                      />
                      <Select
                        value={customization.buttonColor}
                        onValueChange={(value) => handleCustomizationChange("buttonColor", value)}
                      >
                        <SelectTrigger className="w-full ml-2">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {buttonColorPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              <div className="flex items-center">
                                <div
                                  className="w-4 h-4 rounded-full mr-2"
                                  style={{ backgroundColor: preset.color }}
                                ></div>
                                {preset.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <div className="flex mt-1">
                      <input
                        id="textColor"
                        type="color"
                        className="h-10 w-10 border rounded"
                        value={customization.textColor}
                        onChange={(e) => handleCustomizationChange("textColor", e.target.value)}
                      />
                      <Select
                        value={customization.textColor}
                        onValueChange={(value) => handleCustomizationChange("textColor", value)}
                      >
                        <SelectTrigger className="w-full ml-2">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {textColorPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              <div className="flex items-center">
                                <div
                                  className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                  style={{ backgroundColor: preset.color }}
                                ></div>
                                {preset.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="borderRadius">Border Radius</Label>
                    <Select
                      value={customization.borderRadius}
                      onValueChange={(value) => handleCustomizationChange("borderRadius", value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select border radius" />
                      </SelectTrigger>
                      <SelectContent>
                        {borderRadiusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select
                      value={customization.fontSize}
                      onValueChange={(value) => handleCustomizationChange("fontSize", value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        {fontSizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="padding">Padding</Label>
                    <Select
                      value={customization.padding}
                      onValueChange={(value) => handleCustomizationChange("padding", value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select padding" />
                      </SelectTrigger>
                      <SelectContent>
                        {paddingOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6">
                  <Label>Button Preview</Label>
                  <div className="mt-2 p-4 border rounded bg-gray-50">
                    <button style={getButtonPreviewStyle()}>{customization.buttonText}</button>
                    <p className="text-xs text-center mt-2 text-gray-500">
                      {customization.smartMode
                        ? "Note: The actual button will adapt to match your theme's style using AI"
                        : "Preview shows the exact button style"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={loadCustomization}>
              Reset
            </Button>
            <Button onClick={saveCustomization} disabled={savingCustomization}>
              {savingCustomization ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="advanced">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Customization</CardTitle>
            <CardDescription>Fine-tune the button with custom CSS and advanced options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customCss">Custom CSS</Label>
                <textarea
                  id="customCss"
                  className="w-full p-2 border rounded mt-1 font-mono text-sm h-32"
                  value={customization.customCss}
                  onChange={(e) => handleCustomizationChange("customCss", e.target.value)}
                  placeholder="Add custom CSS properties here, e.g.:\nbox-shadow: 0 2px 4px rgba(0,0,0,0.1);\ntext-transform: uppercase;"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add custom CSS properties to further customize the button appearance
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI Smart Customization Details
                </h4>
                <p className="text-sm text-amber-700 mb-2">When AI Smart Customization is enabled, the button will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                  <li>Use advanced AI to analyze your theme's button styles</li>
                  <li>Match colors, fonts, borders, and other properties</li>
                  <li>Detect and replicate hover effects</li>
                  <li>Adapt to theme changes automatically</li>
                  <li>Maintain consistent look and feel with your store</li>
                </ul>
                <p className="text-sm text-amber-700 mt-2">
                  Your manual settings will be used as fallbacks if the theme detection fails.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={saveCustomization} disabled={savingCustomization}>
              {savingCustomization ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Advanced Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="manual">
        <Card>
          <CardHeader>
            <CardTitle>Manual Setup</CardTitle>
            <CardDescription>
              If automatic installation doesn't work, you can manually add the script to your theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Copy the following script tag and add it to your theme's <code>theme.liquid</code> file just before the
                closing <code>&lt;/head&gt;</code> tag:
              </p>

              <div className="bg-gray-100 p-3 rounded overflow-x-auto">
                <code className="text-sm">
                  {`<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://v0-bargenix-dashbooard-neon.vercel.app"}/bargain-button.js" async></script>`}
                </code>
              </div>

              <div className="mt-4">
                <h4 className="font-medium mb-2">Steps to add the script manually:</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to your Shopify admin panel</li>
                  <li>Navigate to Online Store &gt; Themes</li>
                  <li>Click "Actions" and then "Edit code"</li>
                  <li>
                    Find the <code>theme.liquid</code> file in the Layout folder
                  </li>
                  <li>
                    Paste the script tag just before the closing <code>&lt;/head&gt;</code> tag
                  </li>
                  <li>Click "Save"</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="testing">
        <Card>
          <CardHeader>
            <CardTitle>Test Your Installation</CardTitle>
            <CardDescription>Verify that the bargain button appears correctly on your product pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                After installing the script, you should see the "Bargain a Deal" button on your product pages, right
                after the "Buy it now" button or "Add to cart" button.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <h4 className="font-medium text-amber-800 mb-2">Troubleshooting Tips:</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>Make sure you've installed the script using the Installation tab</li>
                  <li>Clear your browser cache or try in an incognito/private window</li>
                  <li>Check your browser console for any error messages</li>
                  <li>Some themes may require manual installation</li>
                </ul>
              </div>

              <div className="mt-6">
                <Button onClick={openStorefront} className="flex items-center">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Your Store
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Navigate to any product page to see if the bargain button appears.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
