"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import clsx from "clsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { FaRegBookmark, FaBookmark, FaRegTrashAlt, FaRegQuestionCircle } from "react-icons/fa";
import { IoWarningOutline } from "react-icons/io5";
import { IoEyeOutline } from "react-icons/io5";
import SyncedMarqueeText from "./SyncedMarqueeText";
import PressableActionButton from "./PressableActionButton";

// Animated typing dots shown while the user is typing/changing the dare
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-white/80 inline-block"
          style={{
            animation: "typingBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export default function DareOverlay({
  isOpen,
  onClose,
  selectedGiftId,
  onSelectGift,
  onDareSync,
  dareAcceptanceStatus = "idle",
  onSendDare,
  isSendingDare = false,
  coins = 0,
  onOpenCoinModal,
  recipientName = "Stranger",
  randomDares = [],
  savedDares = [],
  onSaveCustomDare,
  onDeleteCustomDare,
  giftItems = []
}) {
  const [dareTab, setDareTab] = useState("Random");
  const [dareIndex, setDareIndex] = useState(0);
  const [stage, setStage] = useState(1);
  const [dareText, setDareText] = useState("");
  const [marqueeStartAt, setMarqueeStartAt] = useState(() => Date.now());
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingDare, setIsEditingDare] = useState(false);
  const typingTimerRef = useRef(null);
  const dareInputRef = useRef(null);

  const matchedSavedDare = savedDares.find(
    (d) => d.text?.trim().toLowerCase() === dareText?.trim().toLowerCase()
  );
  const isBookmarked = !!matchedSavedDare;

  const ITEMS_PER_PAGE = 8;
  const [giftPageIndex, setGiftPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(giftItems.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setGiftPageIndex(0);
  }, [giftItems]);

  const handleNextGiftPage = (e) => {
    e.stopPropagation();
    if (giftPageIndex >= totalPages - 1) return;
    setGiftPageIndex((prev) => prev + 1);
  };

  const handlePrevGiftPage = (e) => {
    e.stopPropagation();
    if (giftPageIndex <= 0) return;
    setGiftPageIndex((prev) => prev - 1);
  };


  const currentList = dareTab === "Random" ? randomDares : savedDares;
  const activeDare = currentList[dareIndex];

  // Sync state whenever active dare changes
  useEffect(() => {
    if (activeDare) {
      setDareText(activeDare.text || "");
      setIsEditingDare(false);
      // Show typing animation when navigating to a new dare
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 900);
    } else {
      setDareText("");
    }
  }, [activeDare]);

  useEffect(() => {
    if (isEditingDare) {
      dareInputRef.current?.focus();
    }
  }, [isEditingDare]);

  const handleDareTextChange = useCallback((e) => {
    setDareText(e.target.value);
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1000);
  }, []);

  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isOpen && !selectedGiftId && giftItems.length > 0 && onSelectGift) {
      onSelectGift(giftItems[0].id);
    }
  }, [isOpen, selectedGiftId, giftItems, onSelectGift]);

  const selectedGift = giftItems.find((g) => g.id === selectedGiftId);

  // Keep peers' marquee phase locked: new copy gets a fresh shared clock, gift-only
  // updates reuse the current clock so the scroll doesn't jump mid-read.
  const prevDareTextRef = useRef(dareText);
  useEffect(() => {
    if (!isOpen || !onDareSync || !(activeDare || dareText)) return;

    let startAt = marqueeStartAt;
    if (prevDareTextRef.current !== dareText) {
      startAt = Date.now();
      prevDareTextRef.current = dareText;
      setMarqueeStartAt(startAt);
    }

    onDareSync({
      dareId: activeDare?.id,
      dareText,
      marqueeStartAt: startAt,
      gift: selectedGift,
    });
  }, [dareText, selectedGift, isOpen, onDareSync, activeDare, marqueeStartAt]);

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
    if (currentList.length === 0) return;
    setDareIndex((prev) => (prev + 1) % currentList.length);
  };

  const handlePrevDare = () => {
    if (currentList.length === 0) return;
    setDareIndex((prev) => (prev - 1 + currentList.length) % currentList.length);
  };

  const handleTabChange = (tab) => {
    setDareTab(tab);
    setDareIndex(0);
  };

  const currentPrice = selectedGift ? selectedGift.price : 0;
  const hasSufficientCoins = coins >= currentPrice;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm supports-[backdrop-filter]:bg-black/20" onClick={onClose} />

      {/* Overlay Container */}
      <div
        onClick={onClose}
        className="absolute z-50 md:bottom-0 bottom-[14vh] md:left-[48%] left-1/2 -translate-x-1/2 md:-translate-y-[34%] translate-y-0 flex flex-col items-center md:items-end w-full px-4 pb-[env(safe-area-inset-bottom)] md:pb-0"
      >
        {/* 1st VIEW */}
        {stage === 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center md:items-end w-full max-w-[480px] relative"
          >
            {/* Tabs */}
            <div className="flex gap-2 justify-center md:justify-end md:mr-10 mx-auto md:mx-0 -mb-[2px] relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); handleTabChange("Saved"); }}
                className={clsx(
                  "md:px-6 px-4 md:py-2 py-1 md:rounded-t-[20px] rounded-t-[12px] border-2 border-b-0 text-sm font-medium transition-colors",
                  dareTab === "Saved" ? "bg-white text-[#4C1A99] border-white" : "text-white border-white"
                )}
              >
                Saved
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleTabChange("Random"); }}
                className={clsx(
                  "md:px-6 px-4 md:py-2 py-1 md:rounded-t-[20px] rounded-t-[12px] border-2 border-b-0 text-sm font-medium transition-colors",
                  dareTab === "Random" ? "bg-white text-[#4C1A99] border-white" : " text-white border-white"
                )}
              >
                Random
              </button>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="border-2 border-white md:rounded-[40px] rounded-[24px] w-full md:p-8 p-3  relative overflow-hidden"
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/assets/mb.jpg)",
                  backgroundSize: "cover",
                  opacity: 0.8,
                }}
              />

              {/* Glow dots */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] bg-[size:20px_20px] opacity-20" />

              {/* Content */}
              <div className="relative z-10 text-white">

                {/* Top Icons */}
                <div className="flex justify-between items-center w-full md:mb-2   md:px-[1px]">
                  {dareTab === "Random" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isBookmarked) {
                          if (matchedSavedDare && onDeleteCustomDare) {
                            onDeleteCustomDare(matchedSavedDare.id);
                          }
                        } else {
                          if (dareText.trim() && onSaveCustomDare) {
                            onSaveCustomDare(dareText.trim());
                          }
                        }
                      }}
                      className="text-white hover:text-white/80 transition p-1 cursor-pointer active:scale-90"
                    >
                      {isBookmarked ? <FaBookmark size={20} /> : <FaRegBookmark size={20} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeDare && onDeleteCustomDare) {
                          onDeleteCustomDare(activeDare.id);
                          const nextLength = Math.max(0, currentList.length - 1);
                          setDareIndex(prev => nextLength > 0 ? Math.min(prev, nextLength - 1) : 0);
                        }
                      }}
                      className="text-white hover:text-white/80 transition p-1 cursor-pointer active:scale-90"
                    >
                      <FaRegTrashAlt size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-white hover:text-white/80 transition p-1 cursor-pointer active:scale-90"
                  >
                    <FaRegQuestionCircle size={20} />
                  </button>
                </div>

                <p className="text-xs opacity-80 text-center mb-2 -mt-2">Dare {recipientName} to:</p>
                {/* Top Section — Figma 10945:41332 circular prev/next */}
                <div className="flex items-center justify-between gap-2 md:mb-4 mb-2">
                  <button
                    type="button"
                    onClick={handlePrevDare}
                    className="shrink-0 size-9 cursor-pointer transition-all active:scale-90"
                    aria-label="Previous dare"
                  >
                    <img
                      src="/icons/dare-chevron-left.svg"
                      alt=""
                      className="block size-full"
                    />
                  </button>

                  <div className="relative z-20 flex min-w-0 flex-1 justify-center">
                    {isEditingDare ? (
                      <input
                        ref={dareInputRef}
                        type="text"
                        value={dareText}
                        onChange={handleDareTextChange}
                        onBlur={() => setIsEditingDare(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setIsEditingDare(false);
                          }
                        }}
                        placeholder="Type a custom dare..."
                        className="font-otomanopee md:px-4 px-2 md:py-2 py-1 border border-white w-full max-w-[214px] mx-auto rounded-full text-xs text-center bg-transparent text-white placeholder-white/50 focus:outline-none focus:border-white transition-colors"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingDare(true);
                        }}
                        className="font-otomanopee md:px-4 px-2 md:py-2 py-1 border border-white w-full max-w-[214px] rounded-full text-xs text-center bg-transparent text-white overflow-hidden min-w-0"
                        aria-label="Edit dare text"
                      >
                        {dareText?.trim() ? (
                          <SyncedMarqueeText
                            text={dareText}
                            marqueeStartAt={marqueeStartAt}
                            startFromBeginning
                            className="w-full min-w-0"
                            textClassName="font-otomanopee text-xs"
                          />
                        ) : (
                          <span className="text-white/50">Type a custom dare...</span>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextDare}
                    className="shrink-0 size-9 cursor-pointer transition-all active:scale-90"
                    aria-label="Next dare"
                  >
                    <img
                      src="/icons/dare-chevron-right.svg"
                      alt=""
                      className="block size-full"
                    />
                  </button>
                </div>

                {/* Visibility note */}
                <div className="flex items-center justify-center gap-1 text-[10px] opacity-80 md:mb-6 mb-3">
                  <IoEyeOutline className="text-yellow-400 " size={16} /> {recipientName} can see this Dare too
                  {isTyping && <TypingDots />}
                </div>

                {/* Gift Section */}
                <div className="border border-white/40 rounded-2xl px-4 py-3">

                  <div className="flex justify-between">
                    <div className="flex items-center gap-2 mb-3">
                      <img src="/gift-light.svg" alt="coin" className="md:w-7 w-5" />
                      <div>
                        <p className="md:text-sm text-xs font-semibold">Add gift</p>
                        <p className="md:text-[10px] text-[8px] ">
                          Put bet to see what happens
                        </p>
                      </div>
                    </div>


                    <div className="flex gap-2">
                      <FaChevronLeft
                        onClick={handlePrevGiftPage}
                        className={clsx(
                          "text-white text-xl border-2 border-white rounded-full w-5 h-5 md:w-7 md:h-7 p-[3px] flex items-center justify-center transition-all active:scale-90",
                          giftPageIndex === 0 ? "opacity-35 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                        )}
                      />


                      <FaChevronRight
                        onClick={handleNextGiftPage}
                        className={clsx(
                          "text-white text-xl border-2 border-white rounded-full w-5 h-5 md:w-7 md:h-7 p-[3px] flex items-center justify-center transition-all active:scale-90",
                          giftPageIndex >= totalPages - 1 ? "opacity-35 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                        )}
                      />
                    </div>

                  </div>


                  {/* Gift grid: 2 rows × 4 columns */}
                  <div className="grid grid-cols-4 md:gap-3 gap-[7px] w-full">
                    {giftItems.slice(giftPageIndex * ITEMS_PER_PAGE, (giftPageIndex + 1) * ITEMS_PER_PAGE).map((gift) => (
                      <div
                        key={gift.id}
                        onClick={() => {
                          onSelectGift(gift.id);
                        }}
                        className={clsx(
                          "md:rounded-2xl rounded-[11px] md:p-3 py-2 px-1 flex flex-col items-center justify-center cursor-pointer border-[1px] border-b-[3px] transition",
                          selectedGiftId === gift.id
                            ? "border-yellow-500 border-2 bg-white/10"
                            : "border-white/60",
                        )}
                      >
                        <div className="md:text-3xl text-2xl flex items-center justify-center">
                          {gift.imageUrl ? (
                            <img
                              src={gift.imageUrl}
                              className="w-8 h-8 md:w-10 md:h-10 object-contain"
                              alt={gift.name}
                            />
                          ) : (
                            gift.img
                          )}
                        </div>
                        <div className="md:text-xs text-[9px] mt-1 flex justify-center items-center gap-1">💎 {gift.diamonds}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination dots */}
                  <div className="flex justify-center mt-[5px] gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          "md:w-2 w-1 md:h-2 h-1 rounded-full transition-colors",
                          giftPageIndex === idx ? "bg-white" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* {2nd view} */}
        {stage === 2 && (











          <div className="absolute z-[65] md:bottom-[14vh] bottom-[13vh] left-1/2 -translate-x-1/2 md:-translate-x-0 sm:translate-y-0 w-full md:left-1/4 flex flex-col items-center px-4 pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] border-2 bg-[#4E0093]/80 border-white md:rounded-[40px] rounded-[32px] p-6 relative overflow-hidden"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/popupbg.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.3, // decrease image opacity here
                }}
              />
              {/* Header Icons */}
              <div className="flex justify-between items-center relative z-10">
                <button
                  className="text-white/85 z-10 cursor-pointer hover:text-white active:scale-95 transition"
                  onClick={() => setStage(1)}
                >
                  <FaRegBookmark className="text-xl" />
                </button>
                <button className="text-white/80 z-10">
                  <FaRegQuestionCircle className="text-white text-2xl cursor-pointer hover:text-white/80 transition" />
                </button>
              </div>

              {/* Dare Info */}
              <div className="text-center relative z-10 px-4 mb-2">
                <p className="text-[11px] text-white/90 font-medium mb-2">
                  {recipientName} is ready to
                </p>
                <div className="flex items-center justify-center px-4 w-[80%] max-w-full mx-auto py-1.5 border border-white/60 rounded-full text-white md:text-md text-sm overflow-hidden box-border min-w-0">
                  <SyncedMarqueeText
                    text={dareText || "Do a dare"}
                    marqueeStartAt={marqueeStartAt}
                    startFromBeginning
                    className="flex-1 min-w-0 w-full"
                    textClassName="font-otomanopee"
                  />
                </div>
              </div>

              {/* Circular HUD Display */}
              <div className="relative flex items-center justify-between w-full px-2 py-2 z-10 gap-2 border border-white/40 rounded-full mt-4">
                {/* Price Circle */}
                <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center shrink-0">
                  <div className="text-xs mb-0.5">💎</div>
                  <div className="text-[11px] font-bold text-white leading-none">
                    {selectedGift?.diamonds || "---"}
                  </div>
                </div>

                {/* Status Middle */}
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <img src="/gift-light.svg" alt="gift" className="w-6" />
                  </div>
                  <p className="text-[10px] text-white/90 font-medium whitespace-nowrap uppercase tracking-tighter">
                    Gift added
                  </p>
                </div>

                {/* Gift Image Circle */}
                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center shrink-0 ">
                  <div className="text-3xl filter drop-shadow-md">
                    {selectedGift?.imageUrl ? (
                      <img
                        src={selectedGift.imageUrl}
                        className="w-10 h-10 object-contain"
                        alt={selectedGift.name}
                      />
                    ) : (
                      selectedGift?.img || "🎁"
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div onClick={(e) => e.stopPropagation()} className="absolute hidden  md:flex bottom-6 md:left-[53%] right-10 z-50 flex justify-between items-center ">
        {/* Background */}


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
          <PressableActionButton
            onPress={() => onSendDare?.()}
            disabled={
              dareAcceptanceStatus !== "accepted" ||
              !hasSufficientCoins ||
              !selectedGift ||
              isSendingDare
            }
            showCircle={
              dareAcceptanceStatus === "accepted" &&
              hasSufficientCoins &&
              !!selectedGift &&
              !isSendingDare
            }
            className={clsx(
              "w-18 h-18 !opacity-100",
              dareAcceptanceStatus !== "accepted" ||
                !hasSufficientCoins ||
                !selectedGift ||
                isSendingDare
                ? "bg-[#606060]"
                : "bg-red-900",
            )}
            aria-label="Send dare"
          >
            <p className="relative text-white rotate-[-12deg] text-[16px] leading-[14px] tracking-tighter font-otomanopee text-center">
              SEND <br />
              DARE
            </p>
          </PressableActionButton>
        </div>
      </div>











      {/* Bottom Bar Mobile */}
      <div onClick={(e) => e.stopPropagation()} className="absolute bottom-0 z-50 flex items-center justify-between w-full right-1 left-1 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden bg-[#4E0093]/20">
        <div
          className="absolute inset-0 z-0 pointer-events-auto "
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            opacity: 0.8,
          }}
        />

        {!hasSufficientCoins ? (
          <>

            <div className="z-10 mb-3">
              <div className="z-10 text-[10px]  text-white flex items-center gap-1">
                <IoWarningOutline className="text-yellow-500 text-[10px]" />   Insufficient balance
              </div>
              <p className="text-[12px] text-white font-outfit">Spend coins:<span className="font-otomanopee text-[12px] flex mt-1 gap-1 "><img src="/Coins/coin10.png" className="w-4 rounded-full  " alt="" /> {currentPrice}</span> </p>
            </div>


            <button
              onClick={onOpenCoinModal}
              className="z-10 px-6 py-4 mb-3 font-otomanopee text-white transition-all border border-white/50 border-b-[4px] rounded-xl bg-[#0A032D]/20 hover:bg-white/10 active:scale-95 pointer-events-auto text-sm"
            >
              Buy Coins
            </button>
          </>
        ) : (
          <>
            <div className="z-10 flex items-center gap-2 text-sm text-white">
              <span>Spend Coin:</span>

              <span className="flex items-center justify-center gap-1 font-semibold">
                <img
                  src="/Coins/coin10.png"
                  className="w-4 rounded-full"
                  alt=""
                />
                {currentPrice}
              </span>
            </div>








            <PressableActionButton
              onPress={() => onSendDare?.()}
              disabled={
                dareAcceptanceStatus !== "accepted" ||
                !hasSufficientCoins ||
                !selectedGift ||
                isSendingDare
              }
              showCircle={
                dareAcceptanceStatus === "accepted" &&
                hasSufficientCoins &&
                !!selectedGift &&
                !isSendingDare
              }
              className={clsx(
                "z-10 w-18 h-18 mb-3 !opacity-100",
                dareAcceptanceStatus !== "accepted" ||
                  !hasSufficientCoins ||
                  !selectedGift ||
                  isSendingDare
                  ? "bg-[#606060]"
                  : "bg-red-900",
              )}
              aria-label="Send dare"
            >
              <p className="relative text-white rotate-[-12deg] text-[16px] leading-[14px] tracking-tighter font-otomanopee text-center">
                SEND <br />
                DARE
              </p>
            </PressableActionButton>
          </>
        )}
      </div>
    </>
  );
}
