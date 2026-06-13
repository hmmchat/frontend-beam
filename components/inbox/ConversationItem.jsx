"use client";
import Image from "next/image";

function lastMessagePreview(conv) {
  const lm = conv.lastMessage;
  if (!lm) {
    if (conv.isFollowRequest) return "Friend request · tap to respond";
    if (conv.isOutgoingFriendRequest) return "Friend request sent · no messages yet";
    return "No messages yet";
  }
  const t = lm.messageType;
  if (t === "GIFT" || t === "GIFT_WITH_MESSAGE") {
    const txt = lm.message?.trim();
    return txt ? `Gift · ${txt}` : "Gift";
  }
  if (t === "GIF" || t === "GIF_WITH_MESSAGE") {
    const txt = lm.message?.trim();
    return txt ? `GIF · ${txt}` : "GIF";
  }
  return lm.message || "Message";
}

export default function ConversationItem({ conversation, selected, unreadCountDisplay, openRow }) {
  const unread = unreadCountDisplay > 0;
  const st = conversation.userStatus;
  const live = Boolean(
    conversation.broadcastUrl && (conversation.isBroadcasting || st === "broadcasting")
  );

  const openBroadcast = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openRow(conversation)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRow(conversation);
        }
      }}
      className={`flex 0  meeting now items-center gap-4 border-b border-white/20 pb-4 text-left  transition-colors ${unread ? " " : "hover:bg-white/5"
        } ${selected ? "bg-white/5" : ""}`}
    >
      <div className="relative h-12 w-12 shrink-0">
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10">
          {(typeof conversation.otherUser?.displayPictureUrl === "string" && conversation.otherUser.displayPictureUrl.trim()) ? (
            <Image
              src={conversation.otherUser.displayPictureUrl}
              alt={conversation.otherUser?.username || "User"}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold select-none">
              {(conversation.otherUser?.username || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {st === "online" && (
          <span
            className="pointer-events-none absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full border-2 border-[#1a0a2e] bg-emerald-400 shadow-sm translate-x-[1px] translate-y-[1px]"
            title="Online"
            aria-hidden
          />
        )}
        {live && (
          <button
            type="button"
            title="Watch live"
            onClick={(e) => openBroadcast(e, conversation.broadcastUrl)}
            className="absolute -right-1 -top-1 z-10 rounded bg-pink-600 px-1 text-[8px] font-black uppercase leading-none shadow"
          >
            LIVE
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-bold text-base flex items-center gap-2 justify-between">
          <span className="truncate">{conversation.otherUser?.username || "User"}</span>
          {unread && (
            <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center">
              NEW
            </span>
          )}
        </div>
        <div className="text-sm text-white/50 truncate font-light mt-0.5">
          {lastMessagePreview(conversation)}
        </div>
      </div>
    </div>
  );
}
