export default function ErrorAlert({ message, className = "" }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative w-full mt-3 sm:mt-4 ${className}`.trim()}
    >
      {/* Glow layer */}
      <div className="absolute inset-0 bg-red-500/5 rounded-xl sm:rounded-2xl blur-md -z-10 animate-pulse" />

      {/* Error container */}
      <div className="relative flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-red-950/25 backdrop-blur-md border border-red-500/35 rounded-xl sm:rounded-2xl animate-shake shadow-[0_4px_24px_rgba(239,68,68,0.12)] text-left">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-red-500/10 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]">
            <span className="text-red-500 font-bold text-xs">!</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <span className="text-red-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider font-outfit">
            Warning
          </span>
          <span className="text-white/90 text-xs sm:text-[13px] md:text-sm font-normal leading-relaxed font-outfit break-words whitespace-pre-wrap">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
