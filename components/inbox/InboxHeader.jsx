"use client";
import { useRouter } from "next/navigation";
import { FaArrowLeftLong } from "react-icons/fa6";

export default function InboxHeader({ walletCoins, firstMessageCost, activeChat }) {
  const router = useRouter();
  return (
    <div
      className={`flex items-center justify-between relative gap-3 font-semibold p-4 md:p-0 md:mb-4 ${activeChat ? "md:flex hidden" : "flex"
        }`}
    >
      <div className="flex items-center gap-3">
        <div className="border border-white rounded-full p-3 md:p-2 active:scale-95" onClick={() => router.push("/")}>
          <FaArrowLeftLong className="text-xl md:text-xl 0  meeting now" />
        </div>
        <span className="text-sm md:text-base">Messages</span>
      </div>
      <button
        type="button"
        onClick={() => router.push("/inbox/friends-wall")}
className="absolute right-4 top-1/2 -translate-y-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:top-auto md:translate-y-0 flex items-center gap-2 border border-white/80 px-3 py-1.5 rounded-full text-sm backdrop-blur-md hover:bg-white/10 transition-colors"
      >
        <span className="grid place-items-center w-6 h-6 text-[10px]">
          <img src="/wall.svg" alt="wall" />
        </span>
        <span className="hidden md:block">
          Friend Wall
        </span>
      </button>
<div className="hidden md:flex items-center gap-4">
        {/* <div className="flex flex-col items-end text-[10px] font-bold text-white/80">
          {walletCoins != null && <span>{walletCoins} coins</span>}
          <span className="text-white/50 font-normal">1st msg ~{firstMessageCost} coins</span>
        </div> */}
        <img src="/LOGO.png" alt="Logo" className="w-24 md:w-32" />
      </div>
    </div>
  );
}
