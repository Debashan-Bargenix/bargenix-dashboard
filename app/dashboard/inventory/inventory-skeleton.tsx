import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function InventorySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 mb-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-56 rounded-full" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Inventory Summary Skeleton */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Skeleton */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
              <Skeleton className="h-40 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Table Skeleton */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-10 w-64" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>

              <div className="rounded-md border">
                <div className="p-4 border-b">
                  <div className="grid grid-cols-8 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <Skeleton key={i} className="h-5 w-full" />
                    ))}
                  </div>
                </div>

                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 border-b">
                    <div className="grid grid-cols-8 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <Skeleton key={j} className="h-5 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
