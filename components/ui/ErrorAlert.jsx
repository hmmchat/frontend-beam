export default function ErrorAlert({ message }) {
  if (!message) return null;

  return (
    <div className="mt-4 relative">
      {/* Glow layers */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-28 h-28 bg-red-600/90 rounded-full blur-[25px]" />
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-44 h-44 bg-red-500/50 rounded-full blur-[60px]" />
      <div className="absolute -left-14 top-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/30 rounded-full blur-[120px]" />

      {/* Error content */}
      <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl animate-shake">
        <div className="
          w-6 h-6 bg-red-600 rounded-md
          flex items-center justify-center
          text-white font-bold text-lg
          shadow-[0_0_12px_rgba(239,68,68,1),0_0_32px_rgba(239,68,68,0.8)] border-2 border-white
        ">
          !
        </div>

        <span className="text-lg">😬</span>

        <span className="text-white text-sm font-medium">
          {message}
        </span>
      </div>
    </div>
  );
}
