import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SimpleAccountProfileProps {
  user: any
}

export function SimpleAccountProfile({ user }: SimpleAccountProfileProps) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

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
