'use client';

import Skeleton from '../ui/Skeleton';
import clsx from 'clsx';

export default function HomeSkeleton() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-purple-950 font-[family-name:var(--font-outfit)]">
      {/* Background matches MeetSomeoneDynamic/DesktopHome */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      />
      
      <main className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden relative z-10">
        {/* Left Side: Real Logo but shimmering CTA */}
        <div className="hidden md:flex relative h-full flex-col items-center justify-center p-8">
           <div className="border-2 border-white/30 w-full h-[96vh] justify-center items-center flex rounded-2xl relative bg-black/10 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-6">
                <img src="/LOGO.png" className="md:w-64 w-44 opacity-80" alt="Logo" />
                <p className="text-white text-2xl opacity-60">Meet someone here,</p>
                <div className="flex items-center gap-2 mt-3 opacity-40">
                   <img src="/assets/video-on.svg" alt="" className="w-4 h-4" />
                   <Skeleton className="w-24 h-4 rounded-lg" />
                </div>
             </div>
           </div>
        </div>

        {/* Right Side: Real Frame but Skeleton Button */}
        <div className="relative flex flex-col items-center justify-center p-8">
           <div className="border-2 border-white/30 w-full h-[96vh] justify-center items-center flex rounded-2xl relative bg-black/10 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-10 w-full max-w-lg">
                {/* Real User/Squad Progress Row but dimmed/simulated */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  {['Me', 'Who', 'Who'].map((label, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                       <div className="relative w-20 h-20 rounded-full border border-white/30 flex items-center justify-center overflow-hidden bg-white/5">
                         {i === 0 ? (
                           <Skeleton circle className="w-full h-full" />
                         ) : (
                           <span className="text-2xl text-white/20">?</span>
                         )}
                       </div>
                       <span className="text-xs text-white/40">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Meet Someone Now Button - Skeletonized */}
                <div className="w-4/6 h-20 rounded-2xl overflow-hidden border border-white/60 bg-black/20">
                   <Skeleton className="w-full h-full" />
                </div>

                {/* Filter Skeletons */}
                <div className="flex gap-4 opacity-40">
                   <Skeleton className="w-24 h-8 rounded-full" />
                   <Skeleton className="w-24 h-8 rounded-full" />
                </div>
             </div>
           </div>
        </div>
      </main>
    </div>
  );
}
