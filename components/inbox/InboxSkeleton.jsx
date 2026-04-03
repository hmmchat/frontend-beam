'use client';

import Skeleton from '../ui/Skeleton';

export default function InboxSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton circle className="w-12 h-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-12 h-3" />
            </div>
            <Skeleton className="w-full h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
