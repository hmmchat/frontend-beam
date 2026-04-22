"use client";

import Image from "next/image";
import { calculateAge } from "@/lib/facecard-utils";
import { useRouter } from "next/navigation";

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
    <div className="col-span-1 flex flex-col items-center justify-center rounded-[3rem] border border-white/20 p-6 text-center">
      <div className="relative">
        <div className="h-full w-full overflow-hidden rounded-full border-2 border-white">
          <Image
            src={user?.displayPictureUrl || "/loadingpage.png"}
            alt="profile"
            width={120}
            height={120}
            className="h-30 w-30 rounded-full object-cover"
          />
        </div>

        <div className="absolute bottom-0 right-[-10] flex h-14 w-14 items-center justify-center rounded-full border border-white/40">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full">
            <Image
              src="/gift/gift8.png"
              alt="gift"
              fill
              className="object-contain"
            />

            <div
              onClick={() => setActiveTab("stickers")}
              className="absolute -bottom-1 -right-4 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full"
            >
              <img src="/edit.png" alt="edit" className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-bold text-yellow-400">
        {firstName} {user?.age || calculateAge(user?.dateOfBirth) || ""}
      </h2>

      <div className="mt-10 w-full space-y-4 px-4 text-left">
        <div
          onClick={() => setActiveTab("account")}
          className={`flex cursor-pointer items-center justify-between gap-2 border-b border-white/20 pb-3 ${activeTab === "account" || activeTab === "default" ? "opacity-100" : "opacity-70"}`}
        >
          <div>
            <p className="text-sm">My account</p>
            <p className="text-[10px] text-white/60">Fill account details</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push("/facecard?view=editor&from=profile");
            }}
            className="shrink-0 rounded-full border border-white/40 px-2 py-1 text-[9px] transition-all hover:bg-white/10 hover:scale-[1.03] active:scale-95"
            aria-label="Open profile completion"
          >
            {progress}% complete
          </button>
          <span className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white">
            ›
          </span>
        </div>

        <div
          onClick={() => setActiveTab("prompts")}
          className={`flex cursor-pointer items-center justify-between border-b border-white/20 pb-3 ${activeTab === "prompts" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">My Prompts</p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
            ›
          </span>
        </div>

        <div
          onClick={() => setActiveTab("getmoney")}
          className={`flex cursor-pointer items-center justify-between border-b border-white/20 pb-3 ${activeTab === "getmoney" ? "opacity-100" : "opacity-70"}`}
        >
          <div>
            <p className="text-sm">Get money</p>
            <p className="text-[10px] text-white/60">
              {moneyModel?.isUnlocked
                ? "Ready to withdraw"
                : `${moneyModel?.diamondsLeft ?? 0} left to withdraw`}
            </p>
          </div>
          <span className="rounded-full border border-white/40 px-3 py-1 text-[9px]">
            💎 {moneyModel?.diamonds ?? 0}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
            ›
          </span>
        </div>

        <div
          onClick={() => setActiveTab("rewards")}
          className={`flex cursor-pointer items-center justify-between ${activeTab === "rewards" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">Rewards & Referrals</p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white">
            ›
          </span>
        </div>
      </div>
    </div>
  );
}
