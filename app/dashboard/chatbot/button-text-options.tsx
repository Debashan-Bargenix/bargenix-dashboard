"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveButtonText } from "@/app/actions/button-customization-actions"

interface ButtonTextOptionsProps {
  shopDomain: string
  initialText?: string
}

const PRESET_OPTIONS = [
  { value: "Bargain a Deal", label: "Bargain a Deal" },
  { value: "Let's Negotiate", label: "Let's Negotiate" },
  { value: "Bargain Now", label: "Bargain Now" },
  { value: "custom", label: "Type your own" },
]

export function ButtonTextOptions({ shopDomain, initialText = "Bargain a Deal" }: ButtonTextOptionsProps) {
  // Find if initialText matches a preset, otherwise set to custom
  const initialOption = PRESET_OPTIONS.find((option) => option.value === initialText) ? initialText : "custom"

  const [selectedOption, setSelectedOption] = useState(initialOption)
  const [customText, setCustomText] = useState(initialOption === "custom" ? initialText : "")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleOptionChange = (value: string) => {
    setSelectedOption(value)
  }

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limit to 30 characters
    setCustomText(e.target.value.slice(0, 30))
  }

  const handleSave = async () => {
    if (!shopDomain) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No Shopify store connected",
      })
      return
    }

    const textToSave = selectedOption === "custom" ? customText : selectedOption

    if (selectedOption === "custom" && (!customText || customText.trim() === "")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Custom button text cannot be empty",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await saveButtonText(shopDomain, textToSave)
      if (result.success) {
        toast({
          title: "Success",
          description: "Button text saved successfully",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to save button text",
        })
      }
    } catch (error) {
      console.error("Error saving button text:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Button Text
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedOption} onValueChange={handleOptionChange} className="space-y-3">
          {PRESET_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`option-${option.value}`} />
              <Label htmlFor={`option-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedOption === "custom" && (
          <div className="mt-4">
            <Label htmlFor="custom-text">Your custom button text</Label>
            <Input
              id="custom-text"
              value={customText}
              onChange={handleCustomTextChange}
              placeholder="Enter custom button text"
              className="mt-1"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground mt-1">{customText.length}/30 characters</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Button Text
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
