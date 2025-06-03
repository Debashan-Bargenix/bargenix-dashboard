"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"

interface UserProfileCardProps {
  user: any
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
  const initials = getInitials(fullName)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="flex justify-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatar_url || ""} alt={fullName} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <h3 className="text-xl font-medium">{fullName}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.company_name && <p className="text-sm text-muted-foreground mt-1">{user.company_name}</p>}
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true)
            setTimeout(() => setIsLoading(false), 1000)
          }}
        >
          {isLoading ? "Loading..." : "Change Avatar"}
        </Button>
      </CardContent>
    </Card>
  )
}
