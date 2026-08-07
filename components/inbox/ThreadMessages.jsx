"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SystemAvatar from "./SystemAvatar";
import { getSystemLine, isSystemNotificationThread } from "../../lib/system-notifications";

function isSyntheticConversationId(cid) {
  if (cid == null || cid === "") return true;
  const s = String(cid);
  return s.startsWith("follow_") || s.startsWith("pending_fr_") || s.startsWith("outgoing_fr_");
}

function parseSquadMeta(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

import MessageSkeleton from "./MessageSkeleton";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-white/70 inline-block"
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

function linkifyText(text) {
  const str = String(text || "");
  const parts = str.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-yellow-300/90 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ThreadMessages({
  messages,
  currentUserId,
  myAvatarUrl,
  messagesScrollRef,
  threadHasMore,
  activeChat,
  loadingThreadOlder,
  loading,
  loadOlderThreadMessages,
  onSquadInviteResponse,
  activePendingSquadInvitationIds,
  peerTyping,
}) {
  const router = useRouter();
  const [squadBusyId, setSquadBusyId] = useState(null);
  const systemLine = getSystemLine(activeChat);
  const isSystemThread = isSystemNotificationThread(activeChat);

  const handleCta = (cta) => {
    if (!cta?.url) return;
    const url = String(cta.url).trim();
    if (cta.kind === "deep" || url.startsWith("/")) {
      router.push(url.startsWith("/") ? url : `/${url}`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const terminalSquadInvitationIds = useMemo(() => {
    const ids = new Set();
    for (const m of messages || []) {
      if (m?.messageType !== "SQUAD_INVITE_OUTCOME") continue;
      const meta = parseSquadMeta(m.squadMeta);
      const invId = meta?.invitationId;
      if (!invId) continue;
      if (meta?.kind === "notice" || meta?.kind === "outcome" || meta?.outcome) {
        ids.add(String(invId));
      }
    }
    return ids;
  }, [messages]);

  return (
    <div
      ref={messagesScrollRef}
      className="flex-1 p-4 overflow-y-auto overflow-x-hidden overscroll-behavior-y-contain scrollbar-hide flex flex-col"
    >
      <div className="flex flex-col gap-4 flex-1">
        {!loading && messages.length > 0 && <div className="mt-auto" />}
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
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-white/40 italic">No messages yet</p>
          </div>
        ) : (
          messages.map((message, idx) => {
            const isMe = message.fromUserId === currentUserId;
            const unreadBubble = !isMe && message.isRead === false;
            const hasText = Boolean(message.message && String(message.message).trim());
            const isSquadInvite = message.messageType === "SQUAD_INVITE";
            const isSquadOutcome = message.messageType === "SQUAD_INVITE_OUTCOME";
            const squadMeta = parseSquadMeta(message.squadMeta);
            const squadInviteResolved =
              squadMeta?.invitationId &&
              (terminalSquadInvitationIds.has(String(squadMeta.invitationId)) ||
                !activePendingSquadInvitationIds?.has(String(squadMeta.invitationId)));
            const isGif =
              message.messageType === "GIF" ||
              message.messageType === "GIF_WITH_MESSAGE" ||
              Boolean(message.gif?.previewUrl || message.gif?.url);
            const isSystemNotification = message.messageType === "SYSTEM_NOTIFICATION";
            const notificationMeta = message.notificationMeta || {};
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
                {!isMe && (
                  isSystemThread ? (
                    <SystemAvatar line={systemLine} size={32} />
                  ) : (typeof activeChat?.otherUser?.displayPictureUrl === "string" && activeChat.otherUser.displayPictureUrl.trim()) ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/90 relative bg-black/30">
                      <Image
                        src={activeChat.otherUser.displayPictureUrl}
                        alt="avatar"
                        fill
                        sizes="32px"
                        className="object-cover object-center"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 border border-white/90 bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold select-none">
                      {(activeChat?.otherUser?.username || "User").charAt(0).toUpperCase()}
                    </div>
                  )
                )}
                <div
                  className={`p-1 rounded-lg max-w-[75%] shadow-md overflow-hidden ${isMe ? "bg-black/20 text-white  " : "bg-black/20 text-white  "
                    } ${unreadBubble && isSystemNotification ? "ring-2 ring-yellow-400/40 border border-yellow-400/50" : ""}`}
                >
                  {isSystemNotification && (
                    <div className="px-4 py-3 space-y-3">
                      {notificationMeta.title ? (
                        <p className={`text-sm font-bold text-white ${unreadBubble ? "" : ""}`}>
                          {notificationMeta.title}
                        </p>
                      ) : null}
                      <p className={`md:text-[12px] text-[11px] font-outfit text-white/95 whitespace-pre-wrap break-words ${unreadBubble ? "font-bold" : ""}`}>
                        {linkifyText(notificationMeta.body || message.message)}
                      </p>
                      {Array.isArray(notificationMeta.images) &&
                        notificationMeta.images.map((src, imgIdx) =>
                          src ? (
                            <div
                              key={`${message.id}-img-${imgIdx}`}
                              className="relative w-full max-w-[18rem] overflow-hidden rounded-xl border border-white/10"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                className="block w-full h-auto object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : null
                        )}
                      {Array.isArray(notificationMeta.ctas) && notificationMeta.ctas.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {notificationMeta.ctas.map((cta, ctaIdx) => (
                            <button
                              key={`${message.id}-cta-${ctaIdx}`}
                              type="button"
                              onClick={() => handleCta(cta)}
                              className="flex items-center gap-2 px-4 py-2 rounded-[10px] border border-white/40 border-b-4 text-white text-xs font-semibold hover:bg-white/10"
                            >
                              {cta.label || "Open"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                        className={`bg-black/20 rounded-xl p-3 mb-1 flex flex-col items-center gap-2 border ${giftUnreadOnly
                          ? "border-yellow-400/80 ring-2 ring-yellow-400/40"
                          : "border-white/10"
                          }`}
                      >
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          {message.giftImageUrl ? (
                            <Image
                              src={message.giftImageUrl}
                              alt="Gift"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-4xl">🎁</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                          <div className="relative w-3 h-3">
                            <Image src="/gift/dimond.png" alt="coin" fill className="object-contain" />
                          </div>
                          <span className="text-xs font-bold">{message.giftAmount || 0}</span>
                        </div>
                      </div>
                    )}
                  {(isSquadInvite || isSquadOutcome) && (
                    <div className="px-4 py-3 space-y-3">
                      <p className="md:text-[12px] text-[11px] font-outfit text-white/95 whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                      {isSquadInvite &&
                        !isMe &&
                        squadMeta?.invitationId &&
                        typeof onSquadInviteResponse === "function" &&
                        (squadInviteResolved ? (
                          <p className="text-[11px] md:text-[12px] text-white/50 font-medium">
                            This invite isn&apos;t active anymore.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">

                            {/* Reject (X icon) */}
                            <button
                              type="button"
                              disabled={squadBusyId === message.id}
                              onClick={async () => {
                                setSquadBusyId(message.id);
                                try {
                                  await onSquadInviteResponse(
                                    squadMeta.invitationId,
                                    "reject",
                                  );
                                } finally {
                                  setSquadBusyId(null);
                                }
                              }}
                              className="w-8 h-8 text-red-500 flex items-center justify-center rounded-full bg-red/10  disabled:opacity-40"
                            >
                              ✕
                            </button>

                            <button
                              type="button"
                              disabled={squadBusyId === message.id}
                              onClick={async () => {
                                setSquadBusyId(message.id);
                                try {
                                  await onSquadInviteResponse(
                                    squadMeta.invitationId,
                                    "accept",
                                  );
                                } finally {
                                  setSquadBusyId(null);
                                }
                              }}
                              className="flex items-center gap-2 px-5 py-3 rounded-[10px] border border-white/40 border-b-4 text-white text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                            >
                              Join now
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h7a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                                />
                              </svg>
                            </button>

                          </div>
                        ))}
                    </div>
                  )}
                  {message.message &&
                    (!isGif || message.messageType === "GIF_WITH_MESSAGE") &&
                    !isSquadInvite &&
                    !isSquadOutcome &&
                    !isSystemNotification && (
                      <div
                        className={`md:px-4  px-3 py-2 whitespace-pre-wrap break-words md:text-[12px] text-[11px] font-outfit   ${unreadBubble ? "font-bold" : ""
                          }`}
                      >
                        {linkifyText(message.message)}
                      </div>
                    )}
                </div>
                {isMe && (
                  (typeof myAvatarUrl === "string" && myAvatarUrl.trim()) ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/90 relative bg-black/30">
                      <Image
                        src={myAvatarUrl}
                        alt="me"
                        fill
                        sizes="32px"
                        className="object-cover object-center"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 border border-white/90 bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white text-xs font-bold select-none">
                      {typeof window !== "undefined" && localStorage.getItem("myUsername")
                        ? localStorage.getItem("myUsername").charAt(0).toUpperCase()
                        : "Y"}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
        {peerTyping && (
          <div className="flex items-start gap-2 self-start">
            {(typeof activeChat?.otherUser?.displayPictureUrl === "string" && activeChat.otherUser.displayPictureUrl.trim()) ? (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/90 relative bg-black/30">
                <Image
                  src={activeChat.otherUser.displayPictureUrl}
                  alt="avatar"
                  fill
                  sizes="32px"
                  className="object-cover object-center"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full flex-shrink-0 border border-white/90 bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold select-none">
                {(activeChat?.otherUser?.username || "User").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="p-3 rounded-xl bg-black/20 text-white border border-white/10 shadow-md flex items-center justify-center min-h-[36px]">
              <TypingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
