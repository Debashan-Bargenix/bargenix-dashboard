import type { BargainRequest } from "@/app/actions/bargain-request-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Clock, CheckCircle, XCircle } from "lucide-react"

interface BargainRequestStatsProps {
  requests: BargainRequest[]
}

export function BargainRequestStats({ requests }: BargainRequestStatsProps) {
  // Count unique customers
  const uniqueCustomers = new Set(
    requests.filter((request) => request.customer_email).map((request) => request.customer_email),
  ).size

  // Count by status
  const pendingCount = requests.filter((request) => request.status === "pending").length
  const approvedCount = requests.filter((request) => request.status === "approved").length
  const rejectedCount = requests.filter((request) => request.status === "rejected").length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <h3 className="text-3xl font-bold">{requests.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">From {uniqueCustomers} unique customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <h3 className="text-3xl font-bold">{pendingCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingCount === 0 ? "No pending requests" : `${pendingCount} requests awaiting action`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <h3 className="text-3xl font-bold">{approvedCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {approvedCount === 0 ? "No approved requests" : `${approvedCount} requests approved`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejected</p>
              <h3 className="text-3xl font-bold">{rejectedCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {rejectedCount === 0 ? "No rejected requests" : `${rejectedCount} requests rejected`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
