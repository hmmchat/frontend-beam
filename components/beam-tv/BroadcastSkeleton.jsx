'use client';

import Skeleton from '../ui/Skeleton';

export default function BroadcastSkeleton() {
  return (
    <div className="w-full h-full bg-gray-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
      <Skeleton className="absolute inset-0 w-full h-full opacity-50" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10">
        <Skeleton circle className="w-24 h-24 mb-6 border-4 border-white/10" />
        <Skeleton className="w-64 h-6 rounded-full mb-2" />
        <Skeleton className="w-48 h-4 rounded-full opacity-60" />
      </div>

      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
        <div className="space-y-4 w-1/2">
           <Skeleton className="w-full h-10 rounded-2xl border border-white/10" />
           <Skeleton className="w-3/4 h-10 rounded-2xl border border-white/10" />
        </div>
        <Skeleton circle className="w-16 h-16 border border-white/20" />
      </div>
    </div>
  );
}
