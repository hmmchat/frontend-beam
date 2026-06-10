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

  const rawCity = otherProfile?.preferredCity || otherProfile?.city || "";
  const cityDisplay = (!rawCity || rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere')
    ? 'Anywhere in India'
    : rawCity === 'Unknown'
      ? ''
      : rawCity.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  return (
    <div className={clsx('flex', 'items-center', 'justify-between', 'md:px-6', 'md:p-2', 'md:mt-3',)}>
      <div className="flex items-center justify-between w-full">
        {/* <button
          type="button"
          onClick={() => setActiveChat(null)}
          className={clsx('md:hidden', 'text-2xl', 'pl-2', 'flex-shrink-0')}
        >
          <IoChevronBack />
        </button> */}


        <div
          className={clsx(
            'flex items-center gap-1',
            'px-3 py-1',
            'rounded-full',
            'border border-white/30',
            '',
            'w-fit max-w-full'
          )}
        >
          {/* Avatar */}
          <div className={clsx('relative h-12 w-12 shrink-0 overflow-visible')}>
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <Image
                src={otherProfile?.displayPictureUrl}
                alt="User"
                fill
                sizes="40px"
                className="object-cover rounded-full"
              />
            </div>

            {headerUserStatus === "online" && (
              <span className="absolute bottom-0 right-0 z-10 h-3 w-3 translate-x-[1px] translate-y-[1px] rounded-full border-2 border-[#1a0a2e] bg-emerald-400 shadow-sm" />
            )}

            {headerLive && (
              <button
                type="button"
                onClick={(e) => openBroadcast(e, activeChat.broadcastUrl)}
                className="absolute -right-1 -top-1 z-10 rounded bg-pink-600 px-1 text-[8px] font-black uppercase leading-none shadow"
              >
                LIVE
              </button>
            )}
          </div>

          {/* Text Section */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="md:font-bold md:text-md text-sm text-white truncate flex items-center gap-2">
              {otherProfile?.username || "User"}
              {ageFromDob(otherProfile?.dateOfBirth)
                ? `, ${ageFromDob(otherProfile?.dateOfBirth)}`
                : ""}


            </span>

            <div className="flex items-center gap-[1px] text-xs">
              <IoLocationOutline className="text-white" />
              <span className=" font-outfit  font-thin truncate">
                {cityDisplay || "—"}

              </span>
            </div>
          </div>




        </div >

        <div className="w-[36%] md:hidden flex justify-start">

          {(activeTab === "inbox" || activeTab === "requests") &&
            !activeChat.isFriend &&
            otherProfile?.id && (
              <button
                type="button"
                disabled={sendFriendBusy}
                onClick={() => sendOfflineFriendRequest(otherProfile.id)}
                className="p-2  pt-2 rounded-full border border-white/40 hover:bg-white/10 active:scale-95 transition-all shrink-0"
              >
                <img src="/addfriend2.svg" alt="Add Friend" className="h-8 w-8" />
              </button>
            )}

        </div>








        {peerId && (
          <div className={clsx('relative', 'flex-shrink-0', 'self-center', 'pr-1', 'flex', 'items-center', 'gap-3')} ref={threadMenuRef}>
            {threadActionBusy ? (
              <span className={clsx('inline-flex', 'px-2', 'text-xs', 'text-white/45')}>…</span>
            ) : (
              <>
                {(activeTab === "inbox" || activeTab === "requests") &&
                  !activeChat.isFriend &&
                  otherProfile?.id && (
                    <button
                      type="button"
                      disabled={sendFriendBusy}
                      onClick={() => sendOfflineFriendRequest(otherProfile.id)}
                      className="p-2 hidden md:flex pt-2 rounded-full border border-white/40 hover:bg-white/10 active:scale-95 transition-all shrink-0"
                    >
                      <img src="/addfriend2.svg" alt="Add Friend" className="h-8 w-8" />
                    </button>
                  )}

                <img src="/logo.png" alt="Logo" className="w-20 md:hidden  " />

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
