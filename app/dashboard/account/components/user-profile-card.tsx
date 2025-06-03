"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

interface UserProfileCardProps {
  user: {
    id: number
    first_name?: string
    last_name?: string
    email?: string
    company_name?: string
    phone?: string
    bio?: string
  }
}

export function UserProfileCard({ user }: UserProfileCardProps) {
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
            <AvatarFallback className="text-lg">{initials || "U"}</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <h3 className="text-xl font-medium">{fullName || "User"}</h3>
          <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
          {user.company_name && <p className="text-sm text-muted-foreground mt-1">{user.company_name}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
