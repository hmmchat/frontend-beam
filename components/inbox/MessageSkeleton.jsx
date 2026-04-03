'use client';

import Skeleton from '../ui/Skeleton';

export default function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {[...Array(5)].map((_, i) => {
        const isMe = i % 2 === 0;
        return (
          <div key={i} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <Skeleton circle className="w-8 h-8 shrink-0 mt-1" />
            <div className={`p-1 rounded-2xl max-w-[70%] space-y-2 ${isMe ? 'bg-black/20 rounded-tr-none' : 'bg-white/10 rounded-tl-none'}`}>
              <Skeleton className={`h-12 w-${isMe ? '48' : '64'} rounded-xl`} />
              <div className="flex justify-between gap-4 px-2 pb-1">
                 <Skeleton className="w-12 h-2 opacity-40" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
