'use client';

export default function DebugBadge({ roomHealthDebug }) {
  if (!roomHealthDebug.graceActive && roomHealthDebug.failureCount <= 0) return null;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[70]">
      <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-[11px] text-white font-mono">
        {roomHealthDebug.graceActive
          ? `PullStranger grace active: ${roomHealthDebug.graceRemainingSec}s`
          : `Room health retries: ${roomHealthDebug.failureCount}/6`}
      </div>
    </div>
  );
}
