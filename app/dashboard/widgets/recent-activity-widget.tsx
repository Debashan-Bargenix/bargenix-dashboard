import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, User } from "lucide-react"
import { queryDb } from "@/lib/db"
import { formatDistanceToNow } from "date-fns"

interface RecentActivityWidgetProps {
  userId: string
}

export async function RecentActivityWidget({ userId }: RecentActivityWidgetProps) {
  const activities = await getRecentActivities(userId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="mr-2 mt-0.5">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

async function getRecentActivities(userId: string) {
  try {
    // Check if the user_activity table exists
    const tableCheck = await queryDb(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'user_activity'
      ) as exists
    `)

    if (!tableCheck[0].exists) {
      console.log("user_activity table doesn't exist yet")
      return [
        {
          description: "Logged in to account",
          timeAgo: "just now",
        },
      ]
    }

    // Query recent activities
    const activitiesQuery = await queryDb(
      `
      SELECT 
        action, 
        details,
        created_at
      FROM user_activity
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `,
      [userId],
    )

    if (!activitiesQuery || activitiesQuery.length === 0) {
      return [
        {
          description: "Logged in to account",
          timeAgo: "just now",
        },
      ]
    }

    return activitiesQuery.map((activity) => {
      let description = activity.action

      // Try to parse details if it's a JSON string
      if (activity.details) {
        try {
          const details = typeof activity.details === "string" ? JSON.parse(activity.details) : activity.details

          if (details.message) {
            description = details.message
          }
        } catch (e) {
          // If parsing fails, just use the action
        }
      }

      return {
        description,
        timeAgo: formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }),
      }
    })
  } catch (error) {
    console.error("Error fetching recent activities:", error)
    return [
      {
        description: "Logged in to account",
        timeAgo: "just now",
      },
    ]
  }
}
