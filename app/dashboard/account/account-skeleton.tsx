import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface AccountSkeletonProps {
  type: "profile" | "form" | "activity"
}

export function AccountSkeleton({ type }: AccountSkeletonProps) {
  if (type === "profile") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-24 mb-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-4">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="pt-4">
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === "form") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === "activity") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  return null
}
