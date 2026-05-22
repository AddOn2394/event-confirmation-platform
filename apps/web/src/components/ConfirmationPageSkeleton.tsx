import { Skeleton } from '@/components/ui/skeleton';

export function ConfirmationPageSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <Skeleton className="mx-auto h-10 w-48" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
