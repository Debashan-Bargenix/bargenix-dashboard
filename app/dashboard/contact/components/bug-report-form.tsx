"use client"

import { useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bug } from "lucide-react"
import { submitBugReport } from "@/app/actions/contact-actions"

export function BugReportForm() {
  const [state, action, isPending] = useActionState(submitBugReport, null)
  const [browserInfo, setBrowserInfo] = useState("")

  useEffect(() => {
    // Collect browser information
    const info = `${navigator.userAgent} | Screen: ${screen.width}x${screen.height} | Viewport: ${window.innerWidth}x${window.innerHeight}`
    setBrowserInfo(info)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Report a Bug
        </CardTitle>
        <CardDescription>Help us fix issues by providing detailed information about the problem</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <input type="hidden" name="browserInfo" value={browserInfo} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select name="severity" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Affects functionality</SelectItem>
                  <SelectItem value="high">High - Major functionality broken</SelectItem>
                  <SelectItem value="critical">Critical - App unusable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Bug Title *</Label>
              <Input id="subject" name="subject" placeholder="Brief description of the bug" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Bug Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what happened and what you were trying to do..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
            <Textarea
              id="stepsToReproduce"
              name="stepsToReproduce"
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedBehavior">Expected Behavior</Label>
              <Textarea
                id="expectedBehavior"
                name="expectedBehavior"
                placeholder="What should have happened?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualBehavior">Actual Behavior</Label>
              <Textarea id="actualBehavior" name="actualBehavior" placeholder="What actually happened?" rows={2} />
            </div>
          </div>

          {state?.message && (
            <div
              className={`p-3 rounded-md ${
                state.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {state.message}
            </div>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Submitting..." : "Submit Bug Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
