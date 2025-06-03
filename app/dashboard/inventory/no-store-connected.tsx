import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export function NoStoreConnected() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <CardTitle>No Shopify Store Connected</CardTitle>
        </div>
        <CardDescription>Connect your Shopify store to manage your inventory from this dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          To view and manage your inventory, you need to connect your Shopify store first. Once connected, you'll be
          able to see all your products, variants, and inventory levels.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 text-sm">
          <p className="font-medium">Already connected a store?</p>
          <p className="mt-1">If you've already connected a store and are seeing this message, try the following:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Refresh this page</li>
            <li>Check your store connection status on the Shopify integration page</li>
            <li>Try reconnecting your store</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button asChild>
          <Link href="/dashboard/shopify">Connect Shopify Store</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/shopify?tab=details">Check Connection Status</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
