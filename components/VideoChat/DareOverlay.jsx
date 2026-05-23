"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { FaRegBookmark, FaRegTrashAlt, FaRegQuestionCircle } from "react-icons/fa";

const giftItems = [
  { id: 1, name: "Monkey", price: 50, img: "🐒" },
  { id: 2, name: "Pika", price: 250, img: "⚡" },
  { id: 3, name: "Super", price: 2000, img: "🦸" },
  { id: 4, name: "Iron", price: 25000, img: "🤖" },
];

const daresList = [
  "Eat a chilli",
  "Do 10 pushups",
  "Sing a song out loud",
  "Show your last photo",
  "Dance for 15 seconds",
  "Bark like a dog"
];

export default function DareOverlay({
  isOpen,
  onClose,
  selectedGiftId,
  onSelectGift,
  onDareSync,
  dareAcceptanceStatus = "idle",
  onSendDare,
  coins = 0,
  onOpenCoinModal,
  recipientName = "Sanya"
}) {
  const [dareTab, setDareTab] = useState("Random");
  const [dareIndex, setDareIndex] = useState(0);
  const [stage, setStage] = useState(1);
  const [synced, setSynced] = useState(false);

  const selectedGift = giftItems.find((g) => g.id === selectedGiftId);

  useEffect(() => {
    if (isOpen && onDareSync) {
      onDareSync({
        dareText: daresList[dareIndex],
        gift: selectedGift,
      });
      setSynced(true);
    }
  }, [dareIndex, selectedGiftId, isOpen, onDareSync]); // Also including onDareSync in dependency array is a good practice

  // Transition to stage 2 when accepted
  useEffect(() => {
    if (dareAcceptanceStatus === "accepted") {
      setStage(2);
    } else {
      setStage(1);
    }
  }, [dareAcceptanceStatus]);

  if (!isOpen) return null;

  const handleNextDare = () => {
    setDareIndex((prev) => (prev + 1) % daresList.length);
  };

  const handlePrevDare = () => {
    setDareIndex((prev) => (prev - 1 + daresList.length) % daresList.length);
  };

  const currentPrice = selectedGift ? selectedGift.price : 0;
  const hasSufficientCoins = coins >= currentPrice;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Overlay Container */}
      <div className="absolute z-40 md:bottom-0 bottom-10 left-1/2 -translate-x-1/2 -translate-y-[34%] z-50 flex flex-col items-center md:items-end w-full px-4">
        {/* 1st VIEW */}
        {stage === 1 && (
          <div className="flex flex-col items-center md:items-end w-full max-w-[480px] relative">
            {/* Tabs */}
            <div className="flex gap-2 md:mr-6 ml-40 -mb-[2px] relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setDareTab("Saved"); }}
                className={clsx(
                  "md:px-6 px-4 md:py-2 py-1 md:rounded-t-[20px] rounded-t-[10px] border-2 border-b-0 text-sm font-medium transition-colors",
                  dareTab === "Saved" ? "bg-white text-[#4C1A99] border-white" : "bg-[#1A1A1A] text-white border-white"
                )}
              >
                Saved
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDareTab("Random"); }}
                className={clsx(
                  "md:px-6 px-4 md:py-2 py-1 md:rounded-t-[20px] rounded-t-[10px] border-2 border-b-0 text-sm font-medium transition-colors",
                  dareTab === "Random" ? "bg-white text-[#4C1A99] border-white" : "bg-[#1A1A1A] text-white border-white"
                )}
              >
                Random
              </button>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="border-2 border-white md:rounded-[40px] rounded-[24px] w-full md:p-8 p-3 shadow-2xl relative overflow-hidden"
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/assets/mb.jpg)",
                  backgroundSize: "cover",
                }}
              />

              {/* Glow dots */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] bg-[size:20px_20px] opacity-20" />

              {/* Content */}
              <div className="relative z-10 text-white">

                {/* Top Icons */}
                <div className="flex justify-between items-center w-full md:mb-2">
                  {dareTab === "Random" ? (
                    <FaRegBookmark
                      className="text-white text-xl cursor-pointer hover:text-white/80 transition"
                      onClick={() => setDareTab("Saved")}
                    />
                  ) : (
                    <FaRegTrashAlt
                      className="text-white text-xl cursor-pointer hover:text-white/80 transition"
                    />
                  )}
                  <FaRegQuestionCircle className="text-white text-2xl cursor-pointer hover:text-white/80 transition" />
                </div>

                <p className="text-xs opacity-80 text-center mb-2">Dare {recipientName} to:</p>
                {/* Top Section */}
                <div className="flex items-center justify-between md:mb-4 mb-2">



                  <FaAngleLeft
                    onClick={handlePrevDare}
                    className="text-white text-xl border-2 border-white rounded-full  w-9 h-8 p-1.5  flex items-center justify-center cursor-pointer transition-all active:scale-90"
                  />



                  <div className="text-center w-full">

                    <div className=" md:px-4 px-2 py-2 border-2 border-white/80 w-[85%] mx-auto rounded-full text-sm font-medium">
                      {daresList[dareIndex]}
                    </div>


                  </div>

                  <FaAngleRight
                    onClick={handleNextDare}
                    className="text-white text-xl border-2 border-white rounded-full w-9 h-8 p-1.5 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                  />
                </div>

                {/* Visibility note */}
                <div className="flex items-center justify-center gap-2 text-xs opacity-80 md:mb-6 mb-3">
                  👁️ {recipientName} can see this Dare too
                </div>

                {/* Gift Section */}
                <div className="border border-white/40 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <img src="/gift-light.svg" alt="coin" className="md:w-7 w-5" />
                    <div>
                      <p className="md:text-sm text-xs font-semibold">Add gift</p>
                      <p className="md:text-xs text-[8px] opacity-70">
                        Put bet to see what happens
                      </p>
                    </div>
                  </div>

                  {/* Gift Row */}
                  <div className="flex md:gap-3  gap-[7px] overflow-x-auto pb-2">
                    {giftItems.map((gift) => (
                      <div
                        key={gift.id}
                        onClick={() => {
                          onSelectGift(gift.id);
                        }}
                        className={clsx(
                          "md:min-w-[85px] min-w-[70px] md:rounded-2xl rounded-[11px] md:p-3 py-2 p flex flex-col items-center justify-center cursor-pointer border-[1px] border-b-[3px] transition",
                          selectedGiftId === gift.id
                            ? "border-white bg-white/20"
                            : "border-white/60",
                        )}
                      >
                        <div className="md:text-3xl text-2xl">{gift.img}</div>
                        <div className="md:text-xs text-[9px] mt-1 flex justify-center items-center gap-1">💎 {gift.price}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination dots */}
                  <div className="flex justify-center mt-3 gap-1">
                    <div className="md:w-2 w-1 md:h-2 h-1 bg-white rounded-full" />
                    <div className="md:w-2 w-1 md:h-2 h-1 bg-white/40 rounded-full" />
                    <div className="md:w-2 w-1 md:h-2 h-1 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* {2nd view} */}
        {stage === 2 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className=" w-full max-w-[360px] border-2 border-white/40 rounded-[32px] p-6  relative overflow-hidden"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/assets/mb.jpg)",
                backgroundSize: "cover",
              }}
            />
            {/* Header Icons */}
            <div className="flex justify-between items-center mb-0 px-2 z-10 relative">
              <button className="text-white/80 z-10 cursor-pointer" onClick={() => setStage(1)}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                </svg>
              </button>
              <button className="text-white/80 z-10">
                <FaRegQuestionCircle className="text-white text-2xl cursor-pointer hover:text-white/80 transition" />
              </button>
            </div>

            {/* Sanya Text */}
            <div className="text-center -mt-4 mb-4 relative px-8">

              <p className="text-[10px] text-white/70 uppercase tracking-widest font-medium">
                {recipientName} is ready to
              </p>
              <div className="mt-2 inline-block px-14 py-2.5 border border-white/60 rounded-full text-white font-bold text-base bg-white/5">
                {daresList[dareIndex]}
              </div>

            </div>

            <div className="relative flex items-center justify-center mt-8 pb-4">
              {/* Circular Connector HUD Style Overlay */}


              <div className="relative flex items-center justify-between w-full px-2 py-2 z-10 gap-2 border-[1px] border-white/40 rounded-full">
                {/* Price Circle */}
                <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center ">
                  <div className="text-[10px] scale-125 mb-0.5">💎</div>
                  <div className="text-[10px] font-bold text-white leading-none">
                    {selectedGift?.price || "---"}
                  </div>
                </div>

                {/* Status Middle Circle */}
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                  <div className="w-10 h-10 flex items-center justify-center ">
                    <img src="/gift-light.svg" alt="coin" className="w-7" />
                  </div>
                  <p className="text-[9px] text-white/80 font-medium whitespace-nowrap uppercase tracking-tighter">
                    Gift added
                  </p>
                </div>

                {/* Gift Image Circle */}
                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center ">
                  <div className="text-3xl filter drop-shadow-md">
                    {selectedGift?.img || "🎁"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="absolute z-[60] bottom-0 left-0 right-0 flex items-center justify-between w-full px-3 py-2 sm:px-4 sm:py-3 pointer-events-none">
        {/* Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-auto"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.9,
          }}
        />

        {/* Left Section */}
        <div className="relative z-10 flex-1 pointer-events-auto">
          {!hasSufficientCoins ? (
            <div className="flex flex-col gap-1 items-start">
              <div className="text-[11px] sm:text-sm text-white">
                Insufficient balance
              </div>

              <button
                onClick={onOpenCoinModal}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-all border border-white/40 border-b-2 rounded-lg sm:rounded-xl bg-black/40 hover:bg-white/10 active:scale-95"
              >
                Buy Coins
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] sm:text-sm text-white font-medium">
                Spend coins:
              </div>

              <div className="flex items-center gap-1 text-base sm:text-lg font-semibold text-white">
                <img
                  src="/Coins/coin10.png"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  alt=""
                />
                {currentPrice}
              </div>
            </div>
          )}
        </div>

        {/* Send Dare Button */}
        <div className="relative z-10 pointer-events-auto">
          <button
            type="button"
            disabled={
              dareAcceptanceStatus !== "accepted" ||
              !hasSufficientCoins ||
              !selectedGift
            }
            onClick={() => onSendDare && onSendDare()}
            className={clsx(
              "group relative flex items-center justify-center transition-all",
              "w-[58px] h-[58px] sm:w-[68px] sm:h-[68px]",
              dareAcceptanceStatus !== "accepted" ||
                !hasSufficientCoins ||
                !selectedGift
                ? "opacity-40 grayscale"
                : "hover:scale-105 active:scale-95"
            )}
          >
            <div
              className={clsx(
                "absolute inset-0 rounded-full flex items-center justify-center shadow-xl border-2 sm:border-4 border-black/20",
                dareAcceptanceStatus === "accepted"
                  ? "bg-red-600"
                  : "bg-gray-600"
              )}
            >
              <span className="text-white font-black text-[10px] sm:text-xs leading-[10px] sm:leading-[12px] rotate-[-12deg] uppercase tracking-tight text-center">
                Send
                <br />
                Dare
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
