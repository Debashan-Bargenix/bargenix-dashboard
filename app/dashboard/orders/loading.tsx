import { Skeleton } from "@/components/ui/skeleton"

export default function OrdersLoading() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="h-10 w-48 mb-6" />

      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  )
}
