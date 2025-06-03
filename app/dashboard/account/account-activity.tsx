import { Shield, Settings, LogIn, User, AlertTriangle } from "lucide-react"

interface AccountActivityProps {
  activity: any[]
}

export function AccountActivity({ activity }: AccountActivityProps) {
  // If no activity, show a message
  if (!activity || activity.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">No recent activity to display.</div>
  }

  // Function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4 text-blue-500" />
      case "password_change":
        return <Shield className="h-4 w-4 text-green-500" />
      case "profile_update":
        return <User className="h-4 w-4 text-purple-500" />
      case "settings_change":
        return <Settings className="h-4 w-4 text-orange-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {activity.map((item) => (
        <div key={item.id} className="flex items-start gap-4 py-2">
          <div className="mt-0.5">{getActivityIcon(item.activity_type)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium">{item.details}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{new Date(item.created_at).toLocaleString()}</span>
              {item.ip_address && (
                <>
                  <span>•</span>
                  <span>IP: {item.ip_address}</span>
                </>
              )}
              {item.location && (
                <>
                  <span>•</span>
                  <span>{item.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
