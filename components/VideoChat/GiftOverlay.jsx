"use client";

import clsx from "clsx";
import { useState, useEffect } from "react";
import GiftAnimation from "./GiftAnimation";
import { FaAngleRight } from "react-icons/fa6";
import { FaAngleLeft } from "react-icons/fa6";
import { API, apiRequest } from "@/lib/api";

export default function GiftOverlay({
  isOpen,
  onClose,
  onOpenCoinModal,
  onSelectGift,
  selectedGiftId,
  coins,
  onSendGift,
  className,
  desktopBottomBarClassName,
  mobileBottomBarClassName,
  hideSendButton = false,
}) {
  const [giftItems, setGiftItems] = useState([]);
  const [animGift, setAnimGift] = useState(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    if (isOpen && giftItems.length === 0) {
      apiRequest(API.FRIENDS.GET_GIFT_CATALOG)
        .then(data => {
          if (data && data.gifts) {
            const formatted = data.gifts.map((g, idx) => {
              const diamondsVal = g.diamonds ?? g.coins ?? 0;
              return {
                id: g.giftId || idx,
                name: g.name,
                price: diamondsVal * 100,
                diamonds: diamondsVal,
                img: g.emoji || "🎁",
                imageUrl: g.imageUrl
              };
            });
            setGiftItems(formatted);
          }
        })
        .catch(err => console.error("Failed to load gifts", err));
    }
  }, [isOpen, giftItems.length]);

  const totalPages = Math.max(1, Math.ceil(giftItems.length / itemsPerPage));

  const displayedGifts = giftItems.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const handleNext = () => {
    setPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrev = () => {
    setPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  if (!isOpen) return null;

  const selectedGift = giftItems.find((g) => g.id === selectedGiftId);
  const currentPrice = selectedGift ? selectedGift.price : 0;
  const hasSufficientCoins = coins >= currentPrice;

  const handleSend = () => {
    if (selectedGift) {
      if (typeof onSendGift === 'function') {
        onSendGift(selectedGift);
      } else {
        setAnimGift(selectedGift);
      }
    }
  };

  return (
    <>
      {/* Animation Layer */}
      <GiftAnimation gift={animGift} onComplete={() => setAnimGift(null)} />
      <div className="fixed inset-0 z-20 " onClick={onClose} />
      {/* Main UI */}
      <div className={clsx(
        "absolute z-30 flex flex-col items-end w-full px-4",
        className || "md:bottom-3 right-0 bottom-26 md:right-5 md:-translate-y-[34%]"
      )}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-2 border-white md:rounded-[40px] rounded-[32px] w-full max-w-[500px] md:p-8 p-6  relative overflow-hidden"
        >
          {/* Background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundSize: "cover",
              opacity: 0.9,
            }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between md:mb-8 mb-4">
            <h2 className="text-white md:text-xl font-otomanopee flex justify-center items-center gap-2">
              <img src="/gift-light.svg" alt="coin" className="md:w-7 w-6" /> Add Gift
            </h2>
            <div className="flex gap-4">
              <FaAngleLeft
                onClick={handlePrev}
                className="text-white text-xl border-2 border-white rounded-full w-6 h-6 p-0.5 flex items-center justify-center cursor-pointer transition-all active:scale-90"
              />
              <FaAngleRight
                onClick={handleNext}
                className="text-white text-xl border-2 border-white rounded-full w-6 h-6 p-0.5 flex items-center justify-center cursor-pointer transition-all active:scale-90"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="relative z-10 grid grid-cols-4 md:gap-4 gap-2 mb-1">
            {displayedGifts.map((gift) => (
              <div
                key={gift.id}
                onClick={() => onSelectGift(gift)}
                onDoubleClick={() => setAnimGift(gift)}
                className={clsx(
                  "md:border-[2px] border-[1px] border-white/60 md:border-b-[4px] border-b-[3px] md:rounded-[16.8px] rounded-xl md:px-4 md:py-3 px-1 py-2 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105",
                  selectedGiftId === gift.id
                    ? "border-yellow-400 bg-white/5"
                    : "border-white/10"
                )}
              >
                <div className="md:text-4xl text-xl">
                  {gift.imageUrl ? (
                    <img src={gift.imageUrl} className="w-10 h-10 object-contain" alt={gift.name} />
                  ) : (
                    gift.img
                  )}
                </div>
                <div className="text-white md:text-xs text-[10px]">💎 {gift.diamonds}</div>
              </div>
            ))}
          </div>

          {/* Page Indicators */}
          <div className="relative z-10 flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-1 rounded-full transition-all duration-300",
                  page === i ? "w-6 bg-white" : "w-2 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar Desktop */}
      {selectedGift && (
        <div className={clsx(
          "absolute hidden md:flex z-50 justify-between items-center",
          desktopBottomBarClassName || "bottom-6 md:left-[53%] right-10"
        )}>
          {!hasSufficientCoins ? (
            <>
              <div className="text-white text-sm">Insufficient balance</div>
              <button
                onClick={onOpenCoinModal}
                className=" border border-white/20 px-6 py-2 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                Buy Coins
              </button>
            </>
          ) : (
            <>
              <div className="text-white text-sm flex items-center gap-2">
                Spend Coin:
                <span className="flex justify-center items-center gap-1 font-semibold">
                  <img src="/Coins/coin10.png" className="w-4 rounded-full" alt="" />
                  {currentPrice}
                </span>
              </div>
              {!hideSendButton && (
                <button
                  onClick={handleSend}
                  className={clsx(
                    "bg-black/40 border border-white/20 px-6 py-2 rounded-xl text-white active:scale-95 transition-all",
                    !selectedGift ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
                  )}
                  disabled={!selectedGift}
                >
                  Send Gift
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Bottom Bar Mobile */}
      {selectedGift && (
        <div className={clsx(
          "absolute z-50 flex items-center justify-between w-full right-1 left-1 px-5 py-5 md:hidden",
          mobileBottomBarClassName || "bottom-0"
        )}>
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundSize: "cover",
              opacity: 0.9,
            }}
          />

          {!hasSufficientCoins ? (
            <>
              <div className="z-10 text-sm text-white">
                Insufficient balance
              </div>

              <button
                onClick={onOpenCoinModal}
                className="z-10 px-5 py-3 text-white transition-all border border-white/50 border-b-2 rounded-xl bg-black/40 hover:bg-white/10 active:scale-95"
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

              <button
                type="button"
                disabled={!selectedGift}
                onClick={handleSend}
                className={clsx(
                  "group relative z-10 flex items-center justify-center w-14 h-14",
                  !selectedGift && "opacity-50"
                )}
              >
                <img
                  src="/circle.png"
                  className="absolute inset-0 block w-full h-full transition-none rounded-full bg-pink-800 group-active:rotate-180"
                  alt=""
                />

                <img
                  src="/giftboc.png"
                  className="relative object-contain w-8 h-8 transition-none group-active:scale-80"
                  alt="GIFT"
                />
              </button>
            </>
          )}
        </div>
      )}
    </>




  );
}

