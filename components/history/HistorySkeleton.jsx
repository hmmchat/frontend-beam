'use client';

import Skeleton from '../ui/Skeleton';

export default function HistorySkeleton() {
  return (
    <div className="space-y-8 h-full">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-white/30 rounded-[36px] md:p-4 p-2 space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Skeleton className="w-24 h-6 rounded-full" />
              <Skeleton className="w-24 h-6 rounded-full" />
            </div>
            <Skeleton className="w-48 h-4 rounded" />
          </div>
          
          <div className="border border-white/30 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-16 h-6 rounded-full" />
              <Skeleton className="w-32 h-4" />
              <Skeleton circle className="w-6 h-6 ml-auto" />
            </div>
            <hr className="border-white/30" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton circle className="w-14 h-14" />
                <div className="space-y-2">
                  <Skeleton className="w-32 h-5" />
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton circle className="w-10 h-10" />
                <Skeleton circle className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
