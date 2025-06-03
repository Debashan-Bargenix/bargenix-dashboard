"use client"

import { useState } from "react"
import { useTheme } from "@/hooks/use-theme"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sun, Moon, Monitor } from "lucide-react"

export function PreferencesTab() {
  const { theme, setTheme, mounted } = useTheme()
  const { toast } = useToast()
  const [selectedTheme, setSelectedTheme] = useState<string | undefined>(undefined)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en")
  const [isSaving, setIsSaving] = useState(false)

  // Update local state when theme is available
  if (mounted && theme && selectedTheme === undefined) {
    setSelectedTheme(theme)
  }

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme)
  }

  const savePreferences = async () => {
    if (!selectedTheme) return

    setIsSaving(true)
    try {
      // Save theme
      const success = await setTheme(selectedTheme)

      // Save language
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: selectedTheme,
          language: selectedLanguage,
        }),
      })

      if (success && response.ok) {
        toast({
          title: "Preferences saved",
          description: "Your preferences have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save preferences")
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Account Preferences</CardTitle>
          <CardDescription>Customize your dashboard experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-20 bg-muted rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-24 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-5 w-full bg-muted rounded"></div>
          </div>
          <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Account Preferences</CardTitle>
        <CardDescription>Customize your dashboard experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-base font-medium">Theme</h3>
          <div className="grid grid-cols-3 gap-4">
            <div
              className={`border rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-accent/50 ${
                selectedTheme === "light"
                  ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-6 w-6" />
              <span>Light</span>
            </div>
            <div
              className={`border rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-accent/50 ${
                selectedTheme === "dark"
                  ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="h-6 w-6" />
              <span>Dark</span>
            </div>
            <div
              className={`border rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-accent/50 ${
                selectedTheme === "system"
                  ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleThemeChange("system")}
            >
              <Monitor className="h-6 w-6" />
              <span>System</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-medium">Language</h3>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="hi">हिन्दी</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Choose your preferred language for the dashboard interface.</p>
        </div>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={savePreferences}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  )
}
