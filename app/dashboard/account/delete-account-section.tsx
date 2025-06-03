"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteAccount } from "@/app/actions/account-deletion-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

export function DeleteAccountSection() {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [reason, setReason] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsDeleting(true)
    setErrors({})

    try {
      const formData = new FormData()
      formData.append("confirmationText", confirmationText)
      formData.append("reason", reason)
      formData.append("password", password)

      const result = await deleteAccount(formData)

      if (result.success) {
        toast({
          title: "Account Deleted",
          description: "Your account has been successfully deleted. You will be redirected to the homepage.",
        })

        // Redirect to homepage after a short delay
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setIsDeleting(false)

        if (result.errors) {
          setErrors(result.errors)
        }

        toast({
          title: "Error",
          description: result.message || "Failed to delete account",
          variant: "destructive",
        })
      }
    } catch (error) {
      setIsDeleting(false)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700">Delete Account</CardTitle>
        <CardDescription className="text-red-600">
          This action is permanent and cannot be undone. All your data will be permanently deleted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="delete-account-form" onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-red-700">
              Why are you deleting your account? (Optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please let us know why you're leaving..."
              className="bg-white border-red-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-red-700">
              Enter your password to confirm
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              className="bg-white border-red-200"
              required
            />
            {errors.password && <p className="text-sm text-red-700 mt-1">{errors.password[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationText" className="text-red-700">
              Type DELETE to confirm
            </Label>
            <Input
              id="confirmationText"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="bg-white border-red-200"
              required
            />
            {errors.confirmationText && <p className="text-sm text-red-700 mt-1">{errors.confirmationText[0]}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isDeleting || confirmationText !== "DELETE" || !password}
              className="w-full"
            >
              {isDeleting ? "Deleting Account..." : "Delete My Account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from
                our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => document.getElementById("delete-account-form")?.requestSubmit()}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
