"use client";

import Image from "next/image";
import { calculateAge } from "@/lib/facecard-utils";
import { useRouter } from "next/navigation";
import { getActiveBadgeId } from "@/lib/stickers";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";

export default function ProfileSidebar({
  activeTab,
  setActiveTab,
  user,
  firstName,
  progress,
  moneyModel,
}) {
  const router = useRouter();
  return (
    <div className="col-span-1 flex flex-col items-center justify-center rounded-[3rem] border border-white/40 p-6 text-center">
      <div className="relative">
        <div className="h-full w-full overflow-hidden rounded-full border-2 border-white">
          <img
            src={user?.displayPictureUrl}
            alt="profile"
            width={120}
            height={120}
            className="h-40 w-40 rounded-full object-cover"
          />
        </div>

        {getActiveBadgeId(user) ? (
          <div className="absolute bottom-0 right-[-10] flex h-20 w-20 items-center justify-center rounded-full border border-white/60  ">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full">
              {user?.activeBadgeImageUrl ? (
                <Image
                  src={user.activeBadgeImageUrl}
                  alt="sticker"
                  fill
                  className="object-contain"
                />
              ) : (
                <span className="text-4xl leading-none" aria-hidden>
                  {user?.activeBadge?.giftEmoji}
                </span>
              )}

              <div
                onClick={() => setActiveTab("stickers")}
                className="absolute bottom-8 -right-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full"
              >
                <img src="/edit.svg" alt="edit" className="h-5 w-5 -mt-2" />
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setActiveTab("stickers")}
            className="absolute -bottom-2 right-[-10px] flex h-16 w-16 cursor-pointer  rounded-full border  border-white/60  hover:bg-white/10 hover:border-white transition-all shadow-lg"
            title="Add sticker"
          >
            <img src="/edit.svg" alt="edit" className="h-5 w-5 mt-9 ml-12" />
          </div>
        )}
      </div>
      <h2 className="mt-4 font-sigmar text-xl font-extrabold text-[#F2AD00]">
        {firstName}{" "}
        <span className="text-stroke-yellow">
          {user?.age || calculateAge(user?.dateOfBirth) || ""}
        </span>
      </h2>

      <div className="mt-10 w-full space-y-4 px-4 text-left">
        <div
          onClick={() => setActiveTab("account")}
          className={`flex cursor-pointer items-center justify-between  border-b border-white/20 pb-3 ${activeTab === "account" || activeTab === "default" ? "opacity-100" : "opacity-70"}`}
        >
          <div>
            <p className="text-sm">My account</p>
            <p className="text-[10px] text-white/70 font-outfit">Fill account details</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/facecard?view=editor&from=profile");
              }}
              className="shrink-0  rounded-full border border-white/80 px-2 py-1 text-[9px] font-outfit transition-all hover:bg-white/10 hover:scale-[1.03] active:scale-95"
              aria-label="Open profile completion"
            >
              {progress}% complete
            </button>


            <span className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/70">
              <FaAngleRight />
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("prompts")}
          className={`flex cursor-pointer items-center justify-between border-b border-white/20 pb-3 ${activeTab === "prompts" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">My Prompts</p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
            <FaAngleRight />
          </span>
        </div>

        <div
          onClick={() => setActiveTab("getmoney")}
          className={`flex cursor-pointer items-center justify-between border-b border-white/20 pb-3 ${activeTab === "getmoney" ? "opacity-100" : "opacity-70"}`}
        >
          <div>
            <p className="text-sm">Get money</p>
            <p className="text-[10px] text-white/60 font-outfit">
              {moneyModel?.isUnlocked
                ? "Ready to withdraw"
                : `${moneyModel?.diamondsLeft ?? 0} left to withdraw`}
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full border border-white/40 px-3 py-1 text-[9px]">
              💎 {moneyModel?.diamonds ?? 0}
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
              <FaAngleRight />
            </span>

          </div>
        </div>

        <div
          onClick={() => setActiveTab("rewards")}
          className={`flex cursor-pointer items-center justify-between ${activeTab === "rewards" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">Rewards & Referrals</p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
            <FaAngleRight />
          </span>
        </div>
      </div>
    </div>
  );
}
