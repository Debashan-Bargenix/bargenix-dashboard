import { Skeleton } from "@/components/ui/skeleton"

export default function BargainingSessionsLoading() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="h-10 w-72 mb-6" />

      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  )
}
