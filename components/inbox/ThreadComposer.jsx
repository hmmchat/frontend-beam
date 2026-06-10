"use client";
import { useEffect, useRef, useState } from "react";
import { IoSendSharp } from "react-icons/io5";
import GiftOverlay from "@/components/VideoChat/GiftOverlay";
import clsx from 'clsx';
import { FaRegFaceSmile, FaRegImages } from "react-icons/fa6";
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";

export default function ThreadComposer({
  newMessage,
  setNewMessage,
  sending,
  textInputLocked,
  walletCoins,
  firstMessageCost,
  isGiftModalOpen,
  setIsGiftModalOpen,
  // giftModalItems and giftsCatalogLoading no longer needed — GiftOverlay fetches its own catalog
  sendMessage,
  emitTyping,
  typingTimerRef,
  conversationId,
}) {
  const inputRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);

  const wasSending = useRef(sending);
  const prevConversationId = useRef(conversationId);

  useEffect(() => {
    const justFinishedSending = wasSending.current && !sending;
    const conversationChanged = prevConversationId.current !== conversationId;

    if ((justFinishedSending || conversationChanged) && !textInputLocked && !sending) {
      inputRef.current?.focus();
    }

    wasSending.current = sending;
    prevConversationId.current = conversationId;
  }, [sending, textInputLocked, conversationId]);

  useEffect(() => {
    const onDoc = (e) => {
      const t = e.target;
      if (!t) return;
      if (t.closest?.("[data-emoji-root]")) return;
      if (t.closest?.("[data-gif-root]")) return;
      setEmojiOpen(false);
      setGifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const insertEmoji = (emoji) => {
    if (!emoji || textInputLocked || sending) return;
    const el = inputRef.current;
    const current = newMessage ?? "";
    if (!el) {
      setNewMessage(current + emoji);
      return;
    }
    const start = typeof el.selectionStart === "number" ? el.selectionStart : current.length;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : current.length;
    const next = current.slice(0, start) + emoji + current.slice(end);
    setNewMessage(next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      } catch { }
    });
    emitTyping(Boolean(next.trim()));
  };

  return (
    <>
      <div className={clsx('px-2', 'md:p-4', 'pt-4', 'md:pt-6', 'flex', 'items-center', 'gap-3')}>
        <div className={clsx('relative', 'flex-1')}>
          <div className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
            <button
              type="button"
              onClick={() => { setEmojiOpen((o) => !o); setGifOpen(false); }}
              disabled={sending || textInputLocked}
              className={clsx("p-2 rounded-full hover:bg-white/10 text-white/90 disabled:opacity-40")}
              title="Emoji"
              aria-label="Emoji"
            >
              <FaRegFaceSmile className="text-lg" />
            </button>
            <button
              type="button"
              onClick={() => { setGifOpen((o) => !o); setEmojiOpen(false); }}
              disabled={sending || textInputLocked}
              className={clsx("p-2 rounded-full hover:bg-white/10 text-white/90 disabled:opacity-40")}
              title="GIF"
              aria-label="GIF"
            >
              <FaRegImages className="text-lg" />
            </button>
          </div>
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
            ref={inputRef}
            className={clsx('relative z-0', 'w-full', 'bg-white/5', 'backdrop-blur-md', 'border', 'border-white/60', 'rounded-[12px]', 'py-3', 'md:py-4', 'pl-24', 'pr-14', 'text-white', 'placeholder-white/40', 'focus:outline-none', 'focus:border-white/90', 'transition-all', 'shadow-inner', 'disabled:opacity-50')}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending || textInputLocked || !newMessage.trim()}
            className={clsx('absolute', 'right-4', 'top-1/2', 'z-20', '-translate-y-1/2', 'text-white', 'hover:text-white/80', 'transition-colors', 'disabled:opacity-30')}
          >
            <IoSendSharp className={clsx('text-xl', 'md:text-2xl')} />
          </button>

          {emojiOpen && (
            <div className="absolute bottom-[calc(100%+10px)] left-0 z-[80]" data-emoji-root>
              <EmojiPicker
                onSelect={(e) => {
                  insertEmoji(e);
                  setEmojiOpen(false);
                }}
              />
            </div>
          )}

          {gifOpen && (
            <div className="absolute bottom-[calc(100%+10px)] left-0 z-[80] w-[20rem] max-w-[90vw]" data-gif-root>
              <GifPicker
                onSelect={(gif) => {
                  sendMessage(gif);
                  setGifOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Gift button */}
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

      {/* Gift Overlay — same component as video-chat and /cards */}
      <GiftOverlay
        isOpen={isGiftModalOpen}
        onClose={() => { setIsGiftModalOpen(false); setSelectedGiftId(null); }}
        onOpenCoinModal={() => {}}
        onSelectGift={(gift) => setSelectedGiftId(gift.id)}
        selectedGiftId={selectedGiftId}
        coins={walletCoins ?? 0}
        onSendGift={(gift) => {
          sendMessage(gift);
          setIsGiftModalOpen(false);
          setSelectedGiftId(null);
        }}
      />
    </>
  );
}
