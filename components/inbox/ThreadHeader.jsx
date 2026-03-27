"use client";
import Image from "next/image";
import { IoChevronBack, IoLocationOutline, IoEllipsisVertical } from "react-icons/io5";
import { FaBan, FaUserMinus } from "react-icons/fa6";
import { TiUserAdd } from "react-icons/ti";
import clsx from 'clsx';

export default function ThreadHeader({
  activeChat,
  activeTab,
  otherProfile,
  peerTyping,
  threadMenuOpen,
  setThreadMenuOpen,
  threadMenuRef,
  threadActionBusy,
  sendFriendBusy,
  peerId,
  setActiveChat,
  sendOfflineFriendRequest,
  handleUnfriendPeer,
  handleBlockPeer,
}) {
  const headerUserStatus = activeChat?.userStatus;
  const headerLive =
    activeChat?.broadcastUrl &&
    (activeChat.isBroadcasting || headerUserStatus === "broadcasting");

  const openBroadcast = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const ageFromDob = (dob) => {
    if (!dob) return "";
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
    return y >= 0 ? String(y) : "";
  };

  return (
    <div className={clsx('flex', 'items-center', 'justify-between', 'md:px-6', 'md:p-2', 'md:mt-6', 'bg-black/20', 'md:bg-transparent', 'overflow-visible')}>
      <div className={clsx('flex', 'items-center', 'gap-3', 'bg-purple-600/20', 'border', 'border-white', 'p-1.5', 'pr-6', 'rounded-full', 'min-w-0', 'flex-1')}>
        <button
          type="button"
          onClick={() => setActiveChat(null)}
          className={clsx('md:hidden', 'text-2xl', 'pl-2', 'flex-shrink-0')}
        >
          <IoChevronBack />
        </button>

        <div className={clsx('relative', 'h-12', 'w-12', 'shrink-0', 'overflow-visible')}>
          <div className={clsx('relative', 'h-full', 'w-full', 'overflow-hidden', 'rounded-full', 'border-2', 'border-white')}>
            <Image
              src={otherProfile?.displayPictureUrl || "/assets/ico.png"}
              alt="User"
              fill
              sizes="48px"
              className={clsx('object-cover', 'rounded-full')}
            />
          </div>
          {headerUserStatus === "online" && (
            <span
              className={clsx('pointer-events-none', 'absolute', 'bottom-0', 'right-0', 'z-10', 'h-3', 'w-3', 'translate-x-[1px]', 'translate-y-[1px]', 'rounded-full', 'border-2', 'border-[#1a0a2e]', 'bg-emerald-400', 'shadow-sm')}
              title="Online"
              aria-hidden
            />
          )}
          {headerLive && (
            <button
              type="button"
              title="Watch live"
              onClick={(e) => openBroadcast(e, activeChat.broadcastUrl)}
              className={clsx('absolute', '-right-1', '-top-1', 'z-10', 'rounded', 'bg-pink-600', 'px-1', 'text-[8px]', 'font-black', 'uppercase', 'leading-none', 'shadow')}
            >
              LIVE
            </button>
          )}
        </div>

        <div className={clsx('flex', 'flex-col', 'min-w-0', 'flex-1')}>
          <span className={clsx('font-bold', 'text-lg', 'text-white', 'leading-tight', 'truncate', 'flex', 'items-center', 'gap-2')}>
            {otherProfile?.username || "User"}
            {(activeTab === "inbox" || activeTab === "requests") &&
              !activeChat.isFriend &&
              otherProfile?.id && (
                <button
                  type="button"
                  title="Add friend"
                  disabled={sendFriendBusy}
                  onClick={() => sendOfflineFriendRequest(otherProfile.id)}
                  className={clsx('p-1', 'rounded-full', 'bg-white/10', 'hover:bg-white/20', 'border', 'border-white/20', 'flex-shrink-0')}
                >
                  <TiUserAdd className="text-lg" />
                </button>
              )}
          </span>
          <div className={clsx('flex', 'items-center', 'gap-1', 'text-white/80', 'text-xs')}>
            <IoLocationOutline className={clsx('text-white', 'flex-shrink-0')} />
            <span className="truncate">
              {otherProfile?.preferredCity || "—"}
              {ageFromDob(otherProfile?.dateOfBirth)
                ? ` · ${ageFromDob(otherProfile?.dateOfBirth)}`
                : ""}
            </span>
          </div>
          {peerTyping && (
            <div className={clsx('flex', 'items-center', 'gap-1.5', 'h-4')} aria-label="Typing indicator" title="Typing">
              <span className={clsx('w-1.5', 'h-1.5', 'rounded-full', 'bg-white/80', 'animate-bounce')} style={{ animationDelay: "0ms" }} />
              <span className={clsx('w-1.5', 'h-1.5', 'rounded-full', 'bg-white/80', 'animate-bounce')} style={{ animationDelay: "150ms" }} />
              <span className={clsx('w-1.5', 'h-1.5', 'rounded-full', 'bg-white/80', 'animate-bounce')} style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        {peerId && (
          <div className={clsx('relative', 'flex-shrink-0', 'self-center', 'pr-1')} ref={threadMenuRef}>
            {threadActionBusy ? (
              <span className={clsx('inline-flex', 'px-2', 'text-xs', 'text-white/45')}>…</span>
            ) : (
              <>
                <button
                  type="button"
                  aria-expanded={threadMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setThreadMenuOpen((o) => !o)}
                  className={clsx('p-2', 'rounded-full', 'text-white/85', 'hover:bg-white/15', 'transition-colors')}
                  title="More actions"
                >
                  <IoEllipsisVertical className="text-xl" aria-hidden />
                </button>
                {threadMenuOpen && (
                  <div
                    role="menu"
                    className={clsx('absolute', 'right-0', 'top-[calc(100%+6px)]', 'z-[60]', 'min-w-[11.5rem]', 'rounded-xl', 'border', 'border-white/25', 'bg-neutral-950/95', 'backdrop-blur-md', 'py-1', 'shadow-xl')}
                  >
                    {activeChat.isFriend && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleUnfriendPeer()}
                        className={clsx('flex', 'w-full', 'items-center', 'gap-2', 'px-3', 'py-2.5', 'text-left', 'text-sm', 'text-white', 'hover:bg-white/10')}
                      >
                        <FaUserMinus className={clsx('text-base', 'opacity-85', 'shrink-0')} aria-hidden />
                        Unfriend
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleBlockPeer()}
                      className={clsx('flex', 'w-full', 'items-center', 'gap-2', 'px-3', 'py-2.5', 'text-left', 'text-sm', 'text-red-300', 'hover:bg-white/10')}
                    >
                      <FaBan className={clsx('text-base', 'opacity-85', 'shrink-0')} aria-hidden />
                      Block
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
