import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { Clock, Tag, Percent, Calendar, CheckCircle, XCircle } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { queryDb } from "@/lib/db"
import { formatDate } from "@/lib/utils" // Ensure formatDate is imported
import { PaginationControls } from "@/components/ui/pagination-controls" // Import the new pagination component

interface DiscountCode {
  id: number
  shop_domain: string
  discount_code: string
  variant_id: string
  customer_id: string
  discount_percent: number | null
  shopify_discount_id: string | null
  created_at: string
  expires_at: string | null
  is_used: boolean
  session_id: string | null
  usage_restrictions: any | null // JSONB type
  invalidated_at: string | null
  invalidation_reason: string | null
  validation_attempts: number
  last_validation_attempt: string | null
}

interface DiscountCodesPageProps {
  searchParams: {
    page?: string
    limit?: string
  }
}

export default async function DiscountCodesPage({ searchParams }: DiscountCodesPageProps) {
  const user = await getCurrentUser()
  const shopDomain = user?.shopify_store_domain // This should now be correctly populated

  const currentPage = Number.parseInt(searchParams.page || "1")
  const limit = Number.parseInt(searchParams.limit || "10")
  const offset = (currentPage - 1) * limit

  let discountCodes: DiscountCode[] = []
  let totalCount = 0
  let error: string | null = null

  if (!user) {
    error = "You must be logged in to view discount codes."
  } else if (!shopDomain) {
    error = "No Shopify store connected to your account. Please connect your store to view discount codes."
  } else {
    try {
      // Fetch paginated discount codes for the connected shop domain
      const codesResult = await queryDb<DiscountCode>(
        `SELECT * FROM discount_data WHERE shop_domain = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [shopDomain, limit, offset],
      )
      discountCodes = codesResult

      // Fetch total count for pagination
      const countResult = await queryDb<{ count: string }>(
        `SELECT COUNT(*) FROM discount_data WHERE shop_domain = $1`,
        [shopDomain],
      )
      totalCount = Number.parseInt(countResult[0]?.count || "0")
    } catch (e) {
      console.error("Failed to fetch discount codes:", e)
      error = "Failed to load discount codes. Please try again later."
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="container mx-auto py-10">
      <DashboardHeader
        title="Discount Codes"
        description="Manage and view discount codes generated from bargaining sessions."
      />

      {error ? (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DashboardSection title="Your Discount Codes" description={`Showing codes for ${shopDomain}`}>
          {discountCodes.length === 0 && totalCount === 0 ? (
            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  No Discount Codes Yet
                </CardTitle>
                <CardDescription>No discount codes have been generated for your store yet.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="text-center space-y-3">
                  <p className="text-muted-foreground">
                    Once customers start bargaining and discount codes are issued, they will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Discount Code</TableHead>
                      <TableHead>Variant ID</TableHead>
                      <TableHead>Customer ID</TableHead>
                      <TableHead className="text-right">Discount %</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Session ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {code.discount_code}
                        </TableCell>
                        <TableCell>{code.variant_id}</TableCell>
                        <TableCell>{code.customer_id}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          {code.discount_percent !== null ? (
                            <>
                              {code.discount_percent} <Percent className="h-3 w-3" />
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(code.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {code.expires_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(code.expires_at)}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {code.is_used ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{code.session_id || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} limit={limit} />}
            </div>
          )}
        </DashboardSection>
      )}
    </div>
  )
}
