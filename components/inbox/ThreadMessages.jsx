"use client";
import Image from "next/image";

const PRESET_GIFT_IMAGES = [
  "/gift/gift1.png",
  "/gift/gift2.png",
  "/gift/gift3.png",
  "/gift/gift4.png",
  "/gift/gift5.png",
  "/gift/gift6.png",
  "/gift/gift7.png",
  "/gift/gift8.png",
];

function fallbackPresetGiftImagePath(giftId) {
  if (!giftId || typeof giftId !== "string") return PRESET_GIFT_IMAGES[0];
  let h = 0;
  for (let i = 0; i < giftId.length; i++) {
    h = Math.imul(31, h) + giftId.charCodeAt(i) | 0;
  }
  const idx = (Math.abs(h) % PRESET_GIFT_IMAGES.length) + 1;
  return `/gift/gift${idx}.png`;
}

function isSyntheticConversationId(cid) {
  if (cid == null || cid === "") return true;
  const s = String(cid);
  return s.startsWith("follow_") || s.startsWith("pending_fr_") || s.startsWith("outgoing_fr_");
}

export default function ThreadMessages({
  messages,
  currentUserId,
  myAvatarUrl,
  messagesScrollRef,
  threadHasMore,
  activeChat,
  loadingThreadOlder,
  loadOlderThreadMessages,
}) {
  return (
    <div
      ref={messagesScrollRef}
      className="flex-1 p-4 overflow-y-auto overflow-x-hidden overscroll-behavior-y-contain"
    >
      <div className="flex flex-col gap-4">
        {threadHasMore &&
          activeChat?.conversationId &&
          !isSyntheticConversationId(activeChat.conversationId) && (
            <div className="flex justify-center shrink-0">
              <button
                type="button"
                onClick={() => loadOlderThreadMessages()}
                disabled={loadingThreadOlder}
                className="rounded-full border border-white/30 px-4 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10 disabled:opacity-40"
              >
                {loadingThreadOlder ? "Loading…" : "Load older messages"}
              </button>
            </div>
          )}
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-white/40 italic">No messages yet</p>
          </div>
        ) : (
          messages.map((message, idx) => {
            const isMe = message.fromUserId === currentUserId;
            const unreadBubble = !isMe && message.isRead === false;
            const hasText = Boolean(message.message && String(message.message).trim());
            const isGif =
              message.messageType === "GIF" ||
              message.messageType === "GIF_WITH_MESSAGE" ||
              Boolean(message.gif?.previewUrl || message.gif?.url);
            const giftUnreadOnly =
              unreadBubble &&
              !hasText &&
              (message.giftId ||
                message.messageType === "GIFT" ||
                message.messageType === "GIFT_WITH_MESSAGE");
            return (
              <div
                key={message.id || idx}
                className={`flex items-start gap-2 ${isMe ? "justify-end" : ""}`}
              >
                <div
                  className={`p-1 rounded-2xl max-w-[75%] shadow-md overflow-hidden ${
                    isMe
                      ? "bg-black/20 text-white rounded-tr-none border border-white/10"
                      : "bg-white/10 text-white rounded-tl-none border border-white/5"
                  }`}
                >
                  {isGif && (
                    <button
                      type="button"
                      onClick={() => {
                        const u = message.gif?.url || message.gif?.previewUrl;
                        if (u) window.open(u, "_blank", "noopener,noreferrer");
                      }}
                      className="block w-full text-left"
                      title="Open GIF"
                    >
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-white/10">
                        {message.gif?.previewUrl ? (
                          <img
                            src={message.gif.previewUrl}
                            alt="GIF"
                            className="block w-full max-w-[18rem] h-auto object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="px-4 py-6 text-sm text-white/60">GIF</div>
                        )}
                      </div>
                    </button>
                  )}
                  {(message.giftId ||
                    message.messageType === "GIFT" ||
                    message.messageType === "GIFT_WITH_MESSAGE") && (
                    <div
                      className={`bg-black/20 rounded-xl p-3 mb-1 flex flex-col items-center gap-2 border ${
                        giftUnreadOnly
                          ? "border-yellow-400/80 ring-2 ring-yellow-400/40"
                          : "border-white/10"
                      }`}
                    >
                      <div className="relative w-16 h-16">
                        <Image
                          src={
                            message.giftImageUrl ||
                            (message.giftId
                              ? fallbackPresetGiftImagePath(message.giftId)
                              : PRESET_GIFT_IMAGES[0])
                          }
                          alt="Gift"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                        <div className="relative w-3 h-3">
                          <Image src="/gift/dimond.png" alt="coin" fill className="object-contain" />
                        </div>
                        <span className="text-xs font-bold">{message.giftAmount || 0}</span>
                      </div>
                    </div>
                  )}
                  {message.message && (!isGif || message.messageType === "GIF_WITH_MESSAGE") && (
                    <div
                      className={`px-4 py-2 whitespace-pre-wrap break-words text-[15px] ${
                        unreadBubble ? "font-bold" : ""
                      }`}
                    >
                      {message.message}
                    </div>
                  )}
                </div>
                {isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/30 relative">
                    <Image
                      src={myAvatarUrl || "/assets/avatar1.png"}
                      alt="me"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
