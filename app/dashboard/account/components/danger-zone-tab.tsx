"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface DangerZoneTabProps {
  userId: number
}

export function DangerZoneTab({ userId }: DangerZoneTabProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [password, setPassword] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleDeleteRequest = (e: React.FormEvent) => {
    e.preventDefault()

    if (confirmText !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm account deletion",
        variant: "destructive",
      })
      return
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleDeleteAccount = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete account")
      }

      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      })

      // Redirect to home page after successful deletion
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
    }
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <CardTitle className="text-red-700">Delete Account</CardTitle>
          <CardDescription className="text-red-600">
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleDeleteRequest} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-4">
                <p className="mb-2">
                  This action cannot be undone. This will permanently delete your account and remove all your data from
                  our servers.
                </p>
                <p>
                  To confirm, please type <strong>DELETE</strong> in the field below and enter your password.
                </p>
              </div>

              <Label htmlFor="confirmText">Type DELETE to confirm</Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="border-red-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Your Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-red-200"
              />
            </div>

            <Button type="submit" variant="destructive" disabled={isLoading || confirmText !== "DELETE" || !password}>
              {isLoading ? "Processing..." : "Delete My Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-red-50 border-t border-red-200 text-sm text-red-600">
          Note: All your data will be permanently deleted.
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
