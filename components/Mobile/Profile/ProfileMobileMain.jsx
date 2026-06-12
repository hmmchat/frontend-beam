"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getActiveBadgeId } from "@/lib/stickers";
import { FaAngleRight } from "react-icons/fa6";

export default function ProfileMobileMain({
  router,
  user,
  displayName,
  age,
  progress,
  moneyModel,
  setActiveTab
}) {
  return (
    <>
      <div className="w-full flex justify-between mb-4">
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push("/"); } }}
          className="flex gap-3 items-center rounded-xl py-1 pr-2 text-left text-white hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <span className="w-10 h-10 border rounded-full flex items-center justify-center shrink-0">
            <ArrowLeft size={18} />
          </span>
          <p>My Profile</p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white transition-colors hover:bg-white/10"
          aria-label="Settings"
        >
          <Image src="/setting.png" width={20} height={20} alt="" />
        </button>
      </div>

      <div className="w-full border border-white/30 rounded-[2.5rem] py-6 px-6 pb-20 flex flex-col items-center">
        {/* PROFILE */}
        <div className="relative">
          <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white relative">
            {user?.displayPictureUrl ? (
              <Image
                src={user.displayPictureUrl}
                width={144}
                height={144}
                alt=""
                className="object-cover w-full h-full"
              />
            ) : (
              <Image src="/" width={120} height={120} alt="" />
            )}
          </div>

          {getActiveBadgeId(user) ? (
            <div className="absolute bottom-0 right-[-10px] w-20 h-20 border border-white/60  rounded-full flex items-center justify-center">
              <div className="relative w-18 h-14 flex items-center justify-center">
                {user?.activeBadgeImageUrl ? (
                  <Image
                    src={user.activeBadgeImageUrl}
                    fill
                    alt="sticker"
                    className="object-contain"
                  />
                ) : (
                  <span className="text-3xl leading-none" aria-hidden>
                    {user?.activeBadge?.giftEmoji || "🎁"}
                  </span>
                )}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("stickers");
                  }}
                  className="absolute -bottom-1 -right-2 w-5 h-5 cursor-pointer"
                >
                  <img src="/edit.svg" alt="Edit sticker" />
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("stickers");
              }}
              className="absolute bottom-0 right-[-10px] w-12 h-12 rounded-full border border-dashed border-white/60 bg-[#4f0b99]/40 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-white transition-all shadow-lg"
              title="Add sticker"
            >
              <img src="/edit.svg" alt="edit" className="h-4 w-4 opacity-80" />
            </div>
          )}
        </div>

        <h2 className="mt-4 text-yellow-400 text-xl font-bold">
          {displayName}
          {age != null ? ` ${age}` : ""}
        </h2>

        {/* MENU */}
        <div className="w-full mt-8 space-y-6">
          <div
            onClick={() => setActiveTab("facePreview")}
            className="flex cursor-pointer items-center justify-between gap-2 border-b border-white/20 pb-5"
          >
            <div>
              <p className="text-sm">My account</p>
              <p className="text-[10px] text-white/60 font-outfit">Fill account details</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/facecard?view=editor&from=profile");
                }}
                className="shrink-0 rounded-full border border-white/90 px-2 py-1 text-[9px] transition-all hover:bg-white/10 hover:scale-[1.03] active:scale-95"
                aria-label="Open profile completion"
              >
                {progress}% complete
              </button>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/60">
                <FaAngleRight />
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab("prompts")}
            className="flex items-center justify-between border-b border-white/20 pb-5 cursor-pointer"
          >
            <p className="text-sm">My Prompts</p>
            <span className="w-6 h-6 flex items-center justify-center border border-white/60 rounded-full">
              <FaAngleRight />
            </span>
          </div>

          <div
            onClick={() => setActiveTab("getmoney")}
            className="flex items-center justify-between border-b border-white/20 pb-5 cursor-pointer"
          >
            <div>
              <p className="text-sm">Get money</p>
              <p className="text-[10px] text-white/60 font-outfit">
                {moneyModel.isUnlocked
                  ? "Ready to withdraw"
                  : `${moneyModel.diamondsLeft} left to withdraw`}
              </p>
            </div>

            <div className="flex gap-2">
              <span className="text-[9px] border border-white/90 px-3 py-1 rounded-full">
                💎 {moneyModel.diamonds}
              </span>
              <span className="w-6 h-6 flex items-center justify-center border border-white/60 rounded-full">
                <FaAngleRight />
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab("rewards")}
            className="flex cursor-pointer items-center justify-between"
          >
            <p className="text-sm">Rewards & Referrals</p>
            <span className="w-6 h-6 flex items-center justify-center border border-white/60 rounded-full">
              <FaAngleRight />
            </span>
          </div>
        </div>
      </div>


    </>
  );
}
