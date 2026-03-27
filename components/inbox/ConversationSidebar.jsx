"use client";
import { FaMagnifyingGlass, FaGift, FaEnvelope, FaHeart, FaEye } from "react-icons/fa6";
import ConversationItem from "./ConversationItem";

const MsgFilter = {
  ALL: null,
  WITH_GIFT: "with_gift",
  TEXT_ONLY: "text_only",
  ONLY_FOLLOWS: "only_follows",
};

export default function ConversationSidebar({
  activeChat,
  activeTab,
  setActiveTab,
  setActiveChat,
  msgFilter,
  setMsgFilter,
  conversationSearch,
  setConversationSearch,
  notif,
  requestsTabCount,
  loading,
  listLoadError,
  loadLists,
  currentList,
  filteredConversationList,
  listHasMore,
  loadingMore,
  loadMore,
  computeSidebarUnread,
  openRow,
}) {
  const filterToggle = (key) => (
    <button
      type="button"
      onClick={() => setMsgFilter((f) => (f === key ? MsgFilter.ALL : key))}
      className={`flex shrink-0 items-center justify-center w-11 h-11 min-w-[2.75rem] min-h-[2.75rem] rounded-full border transition-all text-white ${msgFilter === key ? "bg-white/25 border-white" : "border-white/30 bg-white/5"
        }`}
      title={
        key === MsgFilter.WITH_GIFT
          ? "Gift threads (may show no results if none)"
          : key === MsgFilter.TEXT_ONLY
            ? "Text only — last message (may show no results)"
            : "Friend requests / non-friend inbox"
      }
      aria-pressed={msgFilter === key}
      aria-label={
        key === MsgFilter.WITH_GIFT
          ? "Filter by gift messages"
          : key === MsgFilter.TEXT_ONLY
            ? "Filter by text-only last message"
            : "Filter friend requests and follows"
      }
    >
      {key === MsgFilter.WITH_GIFT && <FaGift className="text-lg sm:text-xl" aria-hidden />}
      {key === MsgFilter.TEXT_ONLY && <FaEnvelope className="text-lg sm:text-xl" aria-hidden />}
      {key === MsgFilter.ONLY_FOLLOWS && <FaHeart className="text-lg sm:text-xl" aria-hidden />}
    </button>
  );

  return (
    <div
      className={`min-h-0 md:w-[40%] w-full md:p-6 p-4
      ${activeChat ? "hidden md:flex" : "flex"} flex flex-col`}
    >
      <div className="w-full py-2 text-white space-y-4">

        <div className="flex flex-col gap-3 w-full hidden md:block">
          <div className="flex items-center gap-2 border border-white/30 rounded-full px-3 py-2.5 w-full min-w-0">
            <FaMagnifyingGlass className="text-lg text-white/70 flex-shrink-0" aria-hidden />
            <input
              type="search"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search name or last message…"
              className="flex-1 min-w-[12rem] sm:min-w-[16rem] bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              autoComplete="off"
            />
            {conversationSearch.trim() ? (
              <button
                type="button"
                onClick={() => setConversationSearch("")}
                className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-full hover:bg-white/10 shrink-0"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setActiveTab("inbox"); setActiveChat(null); }}
              className={`px-4 py-1.5 rounded-full text-sm shrink-0 ${activeTab === "inbox" ? "bg-white/20 border border-white" : "border border-transparent"
                }`}
            >
              Inbox
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("requests"); setActiveChat(null); }}
              className={`px-5 py-1.5 rounded-full text-sm shrink-0 ${activeTab === "requests" ? "bg-white/20 border border-white" : "border border-transparent"
                }`}
            >
              Requests{" "}
              <span className="text-xs font-thin">({notif ? requestsTabCount : "—"})</span>
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center md:hidden">
          <div className="flex items-center gap-6  border border-white/30 rounded-full px-2 py-1 w-full max-w-xl">

            {/* Search Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/30">
              <FaMagnifyingGlass className="text-white/80 text-sm" />
            </div>

            {/* Inbox Tab */}
            <button
              onClick={() => {
                setActiveTab("inbox");
                setActiveChat(null);
              }}
              className={`px-8 py-2 rounded-full text-sm transition ${activeTab === "inbox"
                ? "border border-white text-white"
                : "text-white/70"
                }`}
            >
              Inbox
            </button>

            {/* Requests Tab */}
            <button
              onClick={() => {
                setActiveTab("requests");
                setActiveChat(null);
              }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm transition ${activeTab === "requests"
                ? "border border-white text-white"
                : "text-white/70"
                }`}
            >
              {/* Yellow Dot */}
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>

              Requests
              <span className="text-xs font-light">
                ({notif ? requestsTabCount : "—"})
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setActiveTab("sent"); setActiveChat(null); }}
            className={`flex items-center border rounded-full p-3 gap-2 transition-all active:scale-95 ${activeTab === "sent" ? "bg-white/20 border-white" : "border-white/50"
              }`}
          >
            <FaEye className="text-lg" />
            <p className="text-[10px] font-thin text-white">Sent Requests</p>
          </button>
          <div className="flex gap-2 items-center shrink-0">
            {filterToggle(MsgFilter.WITH_GIFT)}
            {filterToggle(MsgFilter.TEXT_ONLY)}
            {filterToggle(MsgFilter.ONLY_FOLLOWS)}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/50 p-6">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-white/60">Loading conversations...</p>
          </div>
        ) : listLoadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
            <p className="text-base font-semibold text-amber-200/95">Couldn&apos;t load conversations</p>
            <p className="max-w-sm text-sm text-white/65">{listLoadError}</p>
            <button
              type="button"
              onClick={() => loadLists()}
              className="mt-1 rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 md:px-0">
            {currentList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/60">No conversations yet</p>
              </div>
            ) : filteredConversationList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/60">No matching conversations</p>
              </div>
            ) : (
              filteredConversationList.map((conversation, i) => {
                const cid = conversation.conversationId || conversation.id || i;
                const selected = activeChat?.rowKey === (conversation.conversationId || conversation.id);
                const convKey = String(conversation.conversationId || conversation.id || i);
                const unreadCountDisplay = computeSidebarUnread(conversation, convKey, selected);
                return (
                  <ConversationItem
                    key={cid}
                    conversation={conversation}
                    selected={selected}
                    unreadCountDisplay={unreadCountDisplay}
                    openRow={openRow}
                  />
                );
              })
            )}
            {listHasMore && currentList.length > 0 && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto mt-2 rounded-full border border-white/30 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 disabled:opacity-40"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
