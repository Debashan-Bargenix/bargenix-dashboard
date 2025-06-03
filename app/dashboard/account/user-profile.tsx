import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

interface UserProfileProps {
  user: any
}

export function UserProfile({ user }: UserProfileProps) {
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Loading profile information...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center pt-4 pb-6 space-y-4">
          <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="space-y-2 w-full">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format the created_at date to show member since
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown"

  // Get user initials for avatar fallback
  const getInitials = () => {
    const firstName = user.first_name || ""
    const lastName = user.last_name || ""
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your profile information</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center text-center pt-4 pb-6 space-y-4">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-blue-100">
            <AvatarImage
              src={user.avatar_url || "/placeholder.svg?height=96&width=96&query=user"}
              alt={`${user.first_name || ""} ${user.last_name || ""}`}
            />
            <AvatarFallback className="text-2xl bg-blue-600 text-white">{getInitials()}</AvatarFallback>
          </Avatar>
        </div>

        <div>
          <h3 className="text-xl font-semibold">{`${user.first_name || ""} ${user.last_name || ""}`}</h3>
          <p className="text-sm text-muted-foreground">{user.email || ""}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              {user.role || "User"}
            </Badge>
            {user.email_verified && (
              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">Member since {memberSince}</div>
      </CardContent>
    </Card>
  )
}
