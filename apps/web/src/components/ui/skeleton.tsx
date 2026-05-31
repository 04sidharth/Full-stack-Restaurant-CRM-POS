import { cn } from '@/lib/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-gray-200/80', className)} />
);

export const SkeletonCard = () => (
  <div className="glass-card rounded-2xl p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-16" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
  </div>
);
