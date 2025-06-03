"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SimplePasswordFormProps {
  userId: number
}

export function SimplePasswordForm({ userId }: SimplePasswordFormProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    try {
      // Simple validation
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setMessage("Please fill in all fields")
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage("Passwords do not match")
        return
      }

      if (formData.newPassword.length < 8) {
        setMessage("Password must be at least 8 characters")
        return
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage("Password updated successfully")
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error updating password:", error)
      setMessage("Failed to update password")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          value={formData.currentPassword}
          onChange={handleChange}
          placeholder="Enter your current password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter your new password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your new password"
        />
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100" : "bg-red-100"}`}>{message}</div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Password"}
      </Button>
    </form>
  )
}
