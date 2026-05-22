'use client';

import clsx from 'clsx';


<svg className={clsx('absolute', 'w-0', 'h-0')}>
  <filter id="glass-distortion">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.003 0.005"
      numOctaves="1"
      seed="2"
      result="noise"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="noise"
      scale="8"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>

export default function MeetNowButton({
  onClick,
  isSearching = false,
  className = "",
  text = "Meet Someone now",
  searchingText = "Searching...",
  isVideoOn = true,
  onVideoClick = null,
  borderClass = "",
  textClass = "",
  iconClass = "",
  containerClass = ""
}) {
  return (
    <button
      onClick={onClick}
      disabled={isSearching}
      className={clsx(
        'group relative z-20 border flex items-center justify-center gap-4  active:scale-[0.98] transition-all overflow-hidden shadow-2xl shadow-purple-500/20 hover:scale-[1.01] hover:brightness-110 hover:shadow-purple-500/20 backdrop-blur-[1px] transition-all duration-300',
        isSearching
          ? 'bg-yellow-500/80 text-black border-black animate-pulse cursor-wait'
          : 'bg-[#0A032D]/30 text-white border-white hover:bg-black/30 cursor-pointer',
        borderClass,   // ✅ custom border
        containerClass,
        className
      )}




      style={{
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        filter: "url(#glass-distortion)"
      }}
    >
      {!isSearching && (
        <div className={clsx('absolute', 'inset-0', 'bg-gradient-to-r', 'from-purple-500/10', 'via-pink-500/10', 'to-purple-500/10', 'opacity-50')} />
      )}
   <div
  onClick={(e) => {
    if (onVideoClick) {
      e.stopPropagation();
      onVideoClick();
    }
  }}
  className={clsx(
    "w-[clamp(36px,10vw,46px)] h-[clamp(36px,10vw,46px)] rounded-full border flex items-center justify-center hover:scale-110 transition-transform z-10",
    onVideoClick ? "cursor-pointer active:scale-95" : "",
    isSearching ? "border-black" : "border-white/60"
  )}
>



        <img
          src={isVideoOn ? "/assets/video-on.svg" : "/assets/video-off.svg"}
          className={clsx(
            "transition-all",
            iconClass,   // ✅ custom icon size
            isSearching ? "brightness-0" : ""
          )}
          alt="video toggle"
        />
      </div>
    <span
  className={clsx(
    "z-10 font-bold leading-none",
    "text-[clamp(14px,4vw,22px)]",
    isSearching ? "text-black" : "text-white",
    textClass
  )}
>
        {isSearching ? searchingText : text}
      </span>
    </button>
  );
}










// <button
//   onClick={onClick}
//   disabled={isSearching}
//   className={clsx(
//     'group relative z-20   flex items-center justify-center ',
//     isSearching
//       ? 'bg-yellow-500/80 text-black border-black animate-pulse cursor-wait'
//       : 'bg-[#0A032D]/30 text-white border-white hover:bg-black/30 cursor-pointer',
//     className
//   )}




//  <img
//         src={isVideoOn ? "/assets/video-on.svg" : "/assets/video-off.svg"}
//         className={clsx(
//           "md:text-xl transition-all md:h-8 md:w-8 h-6 w-6",
//           isSearching ? "brightness-0" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
//         )}
//         alt="video toggle"
//       />