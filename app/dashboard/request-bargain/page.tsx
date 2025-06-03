import { BargainRequestsContainer } from "./bargain-requests-container"

export const metadata = {
  title: "Bargain Requests | Bargenix Dashboard",
  description: "Manage customer bargain requests for your Shopify products",
}

export default function BargainRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bargain Requests</h1>
        <p className="text-muted-foreground">View and manage customer requests for bargaining on your products.</p>
      </div>

      <BargainRequestsContainer />
    </div>
  )
}
