import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function OrdersPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This section will provide an overview of all orders and bargaining-related transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">The Orders dashboard is currently under development.</p>
            <p className="text-sm text-muted-foreground">
              Here you will be able to view and manage all orders, including those with applied bargaining discounts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
