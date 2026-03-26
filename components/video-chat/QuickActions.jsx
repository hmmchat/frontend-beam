'use client';

export default function QuickActions({
  showChatInput,
  callRoles,
  toggleRandomness,
  handleIcebreaker
}) {
  if (showChatInput) return null;

  return (
    <div className="hidden md:block">
      {callRoles.isLocalHost && (
        <button type="button" onClick={toggleRandomness} className="absolute bottom-8 bg-black/60 left-8 text-2xl w-14 h-14 rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 transition-all z-40">
          <img src="/dice.png" alt="Dice" className="w-8 h-8 object-contain" />
        </button>
      )}
      <button type="button" onClick={handleIcebreaker} className={`absolute bottom-8 bg-black/60 left-[670px] w-14 h-14 rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 transition-all z-40 ${callRoles.isLocalHost ? '' : 'left-8 right-auto'}`}>
        <img src="/icecream.png" alt="Ice" className="w-8 h-8 object-contain" />
      </button>
    </div>
  );
}
