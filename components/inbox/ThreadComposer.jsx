"use client";
import { IoSendSharp } from "react-icons/io5";
import GiftModal from "../Home/GiftModal";
import clsx from 'clsx';

export default function ThreadComposer({
  newMessage,
  setNewMessage,
  sending,
  textInputLocked,
  walletCoins,
  firstMessageCost,
  isGiftModalOpen,
  setIsGiftModalOpen,
  giftModalItems,
  giftsCatalogLoading,
  sendMessage,
  emitTyping,
  typingTimerRef,
}) {
  return (
    <>
      <div className={clsx('px-4', 'md:px-6', 'pt-3', 'pb-1', 'flex', 'flex-wrap', 'items-center', 'gap-x-2', 'gap-y-0.5', 'text-[10px]', 'font-semibold', 'text-white/70', 'md:hidden')}>
        {walletCoins != null ? (
          <span>{walletCoins} coins</span>
        ) : (
          <span className="text-white/45">Wallet…</span>
        )}
        <span className="text-white/35">·</span>
        <span>1st text ~{firstMessageCost} coins</span>
      </div>
      <div className={clsx('p-4', 'md:p-6', 'pt-1', 'md:pt-6', 'flex', 'items-center', 'gap-3')}>
        <div className={clsx('relative', 'flex-1')}>
          <input
            placeholder={textInputLocked ? "Send a gift to continue…" : "Type message"}
            value={newMessage}
            onChange={(e) => {
              const v = e.target.value;
              setNewMessage(v);
              emitTyping(Boolean(v.trim()));
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => emitTyping(false), 900);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !textInputLocked) sendMessage();
            }}
            disabled={sending || textInputLocked}
            className={clsx('w-full', 'bg-white/5', 'backdrop-blur-md', 'border', 'border-white/60', 'rounded-[12px]', 'py-3', 'md:py-4', 'px-6', 'pr-14', 'text-white', 'placeholder-white/40', 'focus:outline-none', 'focus:border-white/90', 'transition-all', 'shadow-inner', 'disabled:opacity-50')}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending || textInputLocked || !newMessage.trim()}
            className={clsx('absolute', 'right-4', 'top-1/2', '-translate-y-1/2', 'text-white', 'hover:text-white/80', 'transition-colors', 'disabled:opacity-30')}
          >
            <IoSendSharp className={clsx('text-xl', 'md:text-2xl')} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsGiftModalOpen(true)}
          className={clsx('w-12', 'h-12', 'md:w-16', 'md:h-16', 'flex', 'items-center', 'justify-center', 'active:scale-95', 'transition-transform', 'relative', 'group')}
        >
          <img
            src="/circle.png"
            alt="button-bg"
            className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'bg-pink-700', 'rounded-full', 'object-contain', 'group-hover:scale-105', 'transition-transform', 'opacity-100')}
          />
          <img
            src="/giftboc.png"
            alt="gift-icon"
            className={clsx('relative', 'w-6', 'h-6', 'md:w-8', 'md:h-8', 'object-contain', 'group-hover:rotate-12', 'transition-transform')}
          />
        </button>
      </div>

      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        onSelectGift={(gift) => sendMessage(gift)}
        catalogGifts={giftModalItems}
        catalogLoading={giftsCatalogLoading}
      />
    </>
  );
}
