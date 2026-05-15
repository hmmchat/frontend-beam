'use client';

export default function ShareSheet({ shareUrl, copyShareUrl, setShareOpen }) {
  return (
    <div className="absolute inset-0 z-[65] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShareOpen(false)}>
      <div className="w-full max-w-xl bg-gray-950/80 border border-white/10 rounded-[2rem] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-black tracking-wider">Share link</div>
          <button type="button" onClick={() => setShareOpen(false)} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white/80 hover:bg-white/15">✕</button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white/80 text-xs font-mono outline-none"
          />
          <button
            type="button"
            onClick={copyShareUrl}
            className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-xs hover:bg-white/15"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
