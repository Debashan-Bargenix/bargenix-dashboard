import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function BargainingSessionsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Bargaining Sessions</h1>

      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This section will provide detailed information about customer bargaining sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">The Bargaining Sessions dashboard is currently under development.</p>
            <p className="text-sm text-muted-foreground">
              Here you will be able to view detailed analytics about bargaining interactions, including session
              duration, success rates, and customer engagement metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
