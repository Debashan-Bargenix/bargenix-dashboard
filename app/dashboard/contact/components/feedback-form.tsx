"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MessageSquare, Star } from "lucide-react"
import { submitFeedback } from "@/app/actions/contact-actions"

export function FeedbackForm() {
  const [state, action, isPending] = useActionState(submitFeedback, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Share Your Feedback
        </CardTitle>
        <CardDescription>Help us improve Bargenix by sharing your thoughts and suggestions</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                  <SelectItem value="user-experience">User Experience</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="general">General Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" name="subject" placeholder="Brief summary of your feedback" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea id="message" name="message" placeholder="Please provide detailed feedback..." rows={4} required />
          </div>

          <div className="space-y-3">
            <Label>Overall Rating (Optional)</Label>
            <RadioGroup name="rating" className="flex gap-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                  <Label htmlFor={`rating-${rating}`} className="flex items-center gap-1">
                    {rating} <Star className="h-4 w-4" />
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            {isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
