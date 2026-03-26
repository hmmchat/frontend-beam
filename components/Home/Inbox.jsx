"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IoChevronBack, IoSendSharp, IoLocationOutline, IoEllipsisVertical } from "react-icons/io5";
import { FaArrowLeftLong, FaBan, FaEnvelope, FaEye, FaGift, FaHeart, FaUserMinus } from "react-icons/fa6";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { TiUserAdd } from "react-icons/ti";
import GiftModal from "./GiftModal";
import { API, apiRequest, getAuthHeaders } from "@/lib/api";

/** Backend ConversationQuerySchema.filter */
const MsgFilter = {
  ALL: null,
  WITH_GIFT: "with_gift",
  TEXT_ONLY: "text_only",
  ONLY_FOLLOWS: "only_follows",
};

const LIST_LIMIT = 35;
const THREAD_MSG_LIMIT = 50;
const DEFAULT_FIRST_MSG_COST = 10;
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

/** Same hash as friend-service `fallbackPresetGiftImagePath` (stable art per UUID giftId). */
function fallbackPresetGiftImagePath(giftId) {
  if (!giftId || typeof giftId !== "string") return PRESET_GIFT_IMAGES[0];
  let h = 0;
  for (let i = 0; i < giftId.length; i++) {
    h = Math.imul(31, h) + giftId.charCodeAt(i) | 0;
  }
  const idx = (Math.abs(h) % PRESET_GIFT_IMAGES.length) + 1;
  return `/gift/gift${idx}.png`;
}

function mapCatalogToModalGifts(rows) {
  if (!rows?.length) return [];
  return rows.map((g) => ({
    id: g.giftId,
    name: `${g.emoji || ""} ${g.name}`.trim(),
    price: g.diamonds ?? g.coins ?? 0,
    image: (g.imageUrl && String(g.imageUrl).trim()) || fallbackPresetGiftImagePath(g.giftId),
  }));
}

function conversationMatchesSearch(conv, rawQuery) {
  const q = (rawQuery || "").trim().toLowerCase();
  if (!q) return true;
  const name = (conv.otherUser?.username || "").toLowerCase();
  if (name.includes(q)) return true;
  return lastMessagePreview(conv).toLowerCase().includes(q);
}

function isSyntheticConversationId(cid) {
  if (cid == null || cid === "") return true;
  const s = String(cid);
  return (
    s.startsWith("follow_") ||
    s.startsWith("pending_fr_") ||
    s.startsWith("outgoing_fr_")
  );
}

/** Non-friend: text allowed only when you have not sent any message in this thread yet. */
function canSendTextOnlyNonFriend(messages, currentUserId) {
  if (!currentUserId) return true;
  const mine = messages.filter((m) => m.fromUserId === currentUserId);
  return mine.length === 0;
}

function dedupeAppend(existing, incoming) {
  const keys = new Set(existing.map((c) => String(c.conversationId || c.id)));
  const add = incoming.filter((c) => !keys.has(String(c.conversationId || c.id)));
  return [...existing, ...add];
}

/**
 * Inbox: friends may have empty threads; non-friends only if there is messaging (promoted / has lastMessage).
 * Defensive filter alongside GET /conversations/inbox server rules.
 */
function shouldShowInboxConversation(c) {
  if (!c) return false;
  if (c.isFriend) return true;
  return Boolean(c.lastMessage);
}

/** Sent/Received API rows: only real message threads; FR-only empty bubbles are merged separately. */
function shouldShowSentReceivedApiRow(c) {
  return Boolean(c?.lastMessage);
}

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
  return lm.message || "Message";
}

function sortByLatest(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const tb = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

/** Persists last-open cursor so refresh + WS unread match WhatsApp-style “seen up to here”. */
const INBOX_LAST_SEEN_PREFIX = "inbox:lastSeenMsgV2:";

function readStoredLastSeen(convId) {
  if (typeof window === "undefined" || convId == null || convId === "") return null;
  try {
    const raw = sessionStorage.getItem(INBOX_LAST_SEEN_PREFIX + String(convId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o == null || typeof o !== "object") return null;
    const lastSeenAtMs = Number(o.lastSeenAtMs);
    if (Number.isNaN(lastSeenAtMs)) return null;
    return {
      lastSeenAtMs,
      lastSeenMessageId: o.lastSeenMessageId != null ? String(o.lastSeenMessageId) : null,
    };
  } catch {
    return null;
  }
}

function writeStoredLastSeen(convId, { lastSeenAtMs, lastSeenMessageId }) {
  if (typeof window === "undefined" || convId == null || convId === "") return;
  try {
    sessionStorage.setItem(
      INBOX_LAST_SEEN_PREFIX + String(convId),
      JSON.stringify({
        lastSeenAtMs,
        lastSeenMessageId: lastSeenMessageId != null ? String(lastSeenMessageId) : null,
      })
    );
  } catch {
    /* quota / private mode */
  }
}

function fetchNetworkMessage(err) {
  if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "Load failed")) {
    return "Network error — check your connection, VPN, and that NEXT_PUBLIC_API_BASE_URL points to a reachable API.";
  }
  return err instanceof Error ? err.message : "Network request failed";
}

async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...options.headers },
    });
  } catch (e) {
    throw new Error(fetchNetworkMessage(e));
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const ct = res.headers.get("content-type");
      if (ct && ct.includes("application/json")) {
        const err = await res.json();
        msg = err.message || msg;
      } else {
        const text = await res.text();
        if (text) msg = text;
      }
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 429) {
      throw new Error(`${msg} — please wait a moment and try again.`);
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
}

export default function Inbox() {
  const router = useRouter();
  const [activeChat, setActiveChat] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [msgFilter, setMsgFilter] = useState(MsgFilter.ALL);

  const [inboxList, setInboxList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [sentList, setSentList] = useState([]);

  const [inboxCursor, setInboxCursor] = useState(undefined);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [requestsCursor, setRequestsCursor] = useState(undefined);
  const [requestsHasMore, setRequestsHasMore] = useState(false);
  const [sentCursor, setSentCursor] = useState(undefined);
  const [sentHasMore, setSentHasMore] = useState(false);

  const [messages, setMessages] = useState([]);
  const [threadNextCursor, setThreadNextCursor] = useState(undefined);
  const [threadHasMore, setThreadHasMore] = useState(false);
  const [loadingThreadOlder, setLoadingThreadOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [notif, setNotif] = useState(null);
  const [sendFriendBusy, setSendFriendBusy] = useState(false);

  const [walletCoins, setWalletCoins] = useState(null);
  const [firstMessageCost, setFirstMessageCost] = useState(DEFAULT_FIRST_MSG_COST);
  const [giftModalItems, setGiftModalItems] = useState(null);
  const [giftsCatalogLoading, setGiftsCatalogLoading] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  /** Set when inbox/requests/sent list fetch fails (network / unreachable API). */
  const [listLoadError, setListLoadError] = useState(null);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [threadActionBusy, setThreadActionBusy] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  /** After the user opens a conversation, we switch to client-side unread:
   *  badge = number of incoming messages received after last open while the conversation is closed.
   *  last-seen is also written to sessionStorage so refresh does not fall back to stale server totals.
   */
  const [clientUnreadByConv, setClientUnreadByConv] = useState({});
  const clientLastSeenAtByConvRef = useRef({});
  const messagesScrollRef = useRef(null);
  const threadMenuRef = useRef(null);
  const threadPollRef = useRef(null);
  const wsRef = useRef(null);
  const connectFriendsWsRef = useRef(null);
  const wsReconnectTimerRef = useRef(null);
  const wsReconnectAttemptRef = useRef(0);
  const wsHeartbeatRef = useRef(null);
  const seenWsMessageKeysRef = useRef(new Set());
  /** Refs for WS handler so one connection stays open; avoids stale closures + duplicate reconnects per chat switch. */
  const activeChatRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const loadListsRef = useRef(null);
  const loadNotificationBadgeRef = useRef(null);
  const markReadForPeerRef = useRef(null);
  /** Debounced list sync when WS payload has no unreadCountForConversation (older friend-service). */
  const wsListSyncTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);
  /** After prepending older messages: { scrollHeight, scrollTop } before update */
  const pendingThreadScrollRestoreRef = useRef(null);
  /** Skip scroll-to-bottom when older page was just merged */
  const skipScrollToBottomRef = useRef(false);

  const resolveUserIdFromToken = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub || payload.uid || payload.id || null;
    } catch {
      return localStorage.getItem("userId");
    }
  }, []);

  const enrichUser = useCallback(async (userId) => {
    try {
      const data = await apiRequest(API.USERS.GET_USER(userId));
      const u = data?.user || {};
      return {
        id: userId,
        username: u.username || "User",
        displayPictureUrl: u.displayPictureUrl || null,
        preferredCity: u.preferredCity || "",
        dateOfBirth: u.dateOfBirth,
      };
    } catch {
      return {
        id: userId,
        username: "User",
        displayPictureUrl: null,
        preferredCity: "",
      };
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const b = await apiRequest(API.WALLET.GET_BALANCE);
      setWalletCoins(typeof b?.balance === "number" ? b.balance : null);
    } catch {
      setWalletCoins(null);
    }
  }, []);

  const loadGiftCatalog = useCallback(async () => {
    setGiftsCatalogLoading(true);
    try {
      const data = await apiRequest(API.FRIENDS.GET_GIFT_CATALOG);
      if (typeof data?.firstMessageCostCoins === "number") {
        setFirstMessageCost(data.firstMessageCostCoins);
      }
      const mapped = mapCatalogToModalGifts(data?.gifts || []);
      setGiftModalItems(mapped.length ? mapped : null);
    } catch {
      setGiftModalItems(null);
    } finally {
      setGiftsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWallet();
    loadGiftCatalog();
  }, [refreshWallet, loadGiftCatalog]);

  // Keep "my" avatar stable + up to date in the thread UI.
  useEffect(() => {
    let cancelled = false;
    apiRequest(API.USERS.GET_ME)
      .then((data) => {
        if (cancelled) return;
        const u = data?.user || data || {};
        const url = u.displayPictureUrl || null;
        setMyAvatarUrl(url);
        if (url) localStorage.setItem("displayPictureUrl", url);
      })
      .catch(() => {
        // fall back to localStorage (best-effort)
        const url = localStorage.getItem("displayPictureUrl");
        setMyAvatarUrl(url || null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** GET /me/notifications/count is rate-limited (e.g. 60/min). Coalesce + backoff on 429. */
  const notifNextAllowedAtRef = useRef(0);
  const notifBadgeTimerRef = useRef(null);

  const scheduleNotificationBadge = useCallback(() => {
    const minGapMs = 5000;
    const backoff429Ms = 60000;

    const fire = async () => {
      notifBadgeTimerRef.current = null;
      const now = Date.now();
      if (now < notifNextAllowedAtRef.current) {
        const wait = notifNextAllowedAtRef.current - now + 50;
        notifBadgeTimerRef.current = window.setTimeout(fire, wait);
        return;
      }
      notifNextAllowedAtRef.current = now + minGapMs;
      try {
        const data = await apiRequest(API.FRIENDS.GET_NOTIFICATIONS_COUNT);
        setNotif(data);
      } catch (e) {
        setNotif(null);
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("429") || msg.includes("Rate limit") || msg.includes("Too Many")) {
          notifNextAllowedAtRef.current = Date.now() + backoff429Ms;
        }
      }
    };

    const now = Date.now();
    if (now >= notifNextAllowedAtRef.current) {
      void fire();
      return;
    }
    if (notifBadgeTimerRef.current) return;
    notifBadgeTimerRef.current = window.setTimeout(fire, notifNextAllowedAtRef.current - now + 50);
  }, []);

  useEffect(
    () => () => {
      if (notifBadgeTimerRef.current) {
        clearTimeout(notifBadgeTimerRef.current);
        notifBadgeTimerRef.current = null;
      }
    },
    []
  );

  const loadLists = useCallback(
    async (opts = {}) => {
      const quiet = opts.quiet === true;
      const skipNotificationBadge = opts.skipNotificationBadge === true;
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/");
        return;
      }

      const uid = resolveUserIdFromToken();
      if (uid) {
        setCurrentUserId(uid);
        localStorage.setItem("userId", uid);
      }

      const filterParam = msgFilter || undefined;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      if (!quiet) setLoading(true);
      try {
        setListLoadError(null);
        if (activeTab === "inbox") {
          const data = await fetchJson(
            API.FRIENDS.getInboxConversationsUrl({ limit: LIST_LIMIT, filter: filterParam })
          );
          const inboxRows = (data?.conversations || []).filter(shouldShowInboxConversation);
          setInboxList(sortByLatest(inboxRows));
          setInboxCursor(data?.nextCursor);
          setInboxHasMore(Boolean(data?.hasMore));
        } else if (activeTab === "requests") {
          const recvData = await fetchJson(
            API.FRIENDS.getReceivedRequestsUrl({ limit: LIST_LIMIT, filter: filterParam })
          );
          let conversations = (recvData?.conversations || []).filter(shouldShowSentReceivedApiRow);
          setRequestsCursor(recvData?.nextCursor);
          setRequestsHasMore(Boolean(recvData?.hasMore));

          if (filterParam !== MsgFilter.TEXT_ONLY && filterParam !== MsgFilter.WITH_GIFT) {
            const pendingRaw = await fetchJson(API.FRIENDS.GET_PENDING_REQUESTS, { headers }).catch(
              () => []
            );
            const pendingArr = Array.isArray(pendingRaw) ? pendingRaw : [];
            const convOthers = new Set(conversations.map((c) => String(c.otherUserId)));

            const pendingRows = await Promise.all(
              pendingArr
                .filter((req) => !convOthers.has(String(req.fromUserId)))
                .map(async (req) => {
                  const u = await enrichUser(req.fromUserId);
                  return {
                    id: `pending_fr_${req.id}`,
                    conversationId: `pending_fr_${req.id}`,
                    otherUserId: req.fromUserId,
                    otherUser: {
                      id: req.fromUserId,
                      username: u.username,
                      displayPictureUrl: u.displayPictureUrl,
                    },
                    lastMessage: null,
                    unreadCount: 0,
                    isFriend: false,
                    isFollowRequest: true,
                    followRequestId: req.id,
                    lastMessageAt: req.createdAt,
                    createdAt: req.createdAt,
                  };
                })
            );
            conversations = [...conversations, ...pendingRows];
          }

          setRequestsList(sortByLatest(conversations));
        } else if (activeTab === "sent") {
          const sentConvData = await fetchJson(
            API.FRIENDS.getSentRequestsUrl({ limit: LIST_LIMIT, filter: filterParam })
          );
          let conversations = (sentConvData?.conversations || []).filter(shouldShowSentReceivedApiRow);
          setSentCursor(sentConvData?.nextCursor);
          setSentHasMore(Boolean(sentConvData?.hasMore));

          if (filterParam !== MsgFilter.TEXT_ONLY && filterParam !== MsgFilter.WITH_GIFT) {
            const sentFr = await fetchJson(API.FRIENDS.GET_SENT_FRIEND_REQUESTS, { headers }).catch(
              () => []
            );
            const sentArr = Array.isArray(sentFr) ? sentFr : [];
            const convRecipients = new Set(conversations.map((c) => String(c.otherUserId)));

            const extraRows = await Promise.all(
              sentArr
                .filter((r) => !convRecipients.has(String(r.toUserId)))
                .map(async (r) => {
                  const u = await enrichUser(r.toUserId);
                  return {
                    id: `outgoing_fr_${r.id}`,
                    conversationId: `outgoing_fr_${r.id}`,
                    otherUserId: r.toUserId,
                    otherUser: {
                      id: r.toUserId,
                      username: u.username,
                      displayPictureUrl: u.displayPictureUrl,
                    },
                    lastMessage: null,
                    unreadCount: 0,
                    isFriend: false,
                    isOutgoingFriendRequest: true,
                    outgoingFriendRequestId: r.id,
                    lastMessageAt: r.createdAt,
                    createdAt: r.createdAt,
                  };
                })
            );
            conversations = [...conversations, ...extraRows];
          }

          setSentList(sortByLatest(conversations));
        }

        if (!skipNotificationBadge) scheduleNotificationBadge();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load conversations.";
        setListLoadError(msg);
        console.warn("[Inbox] loadLists", msg);
        if (activeTab === "inbox") {
          setInboxList([]);
          setInboxHasMore(false);
        }
        if (activeTab === "requests") {
          setRequestsList([]);
          setRequestsHasMore(false);
        }
        if (activeTab === "sent") {
          setSentList([]);
          setSentHasMore(false);
        }
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [activeTab, msgFilter, router, resolveUserIdFromToken, scheduleNotificationBadge, enrichUser]
  );

  useEffect(() => {
    setInboxCursor(undefined);
    setRequestsCursor(undefined);
    setSentCursor(undefined);
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    setConversationSearch("");
  }, [activeTab]);

  useEffect(() => {
    if (!threadMenuOpen) return;
    const close = (e) => {
      if (threadMenuRef.current && !threadMenuRef.current.contains(e.target)) {
        setThreadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [threadMenuOpen]);

  useEffect(() => {
    setThreadMenuOpen(false);
  }, [activeChat?.rowKey]);

  /** Mark section seen so notification counts align with the tab the user is viewing */
  useEffect(() => {
    const run = async () => {
      try {
        if (activeTab === "inbox") {
          await apiRequest(API.FRIENDS.MARK_NOTIFICATIONS_SEEN, {
            method: "POST",
            body: JSON.stringify({ section: "INBOX" }),
          });
        } else if (activeTab === "requests") {
          await apiRequest(API.FRIENDS.MARK_NOTIFICATIONS_SEEN, {
            method: "POST",
            body: JSON.stringify({ section: "RECEIVED_REQUESTS" }),
          });
          await apiRequest(API.FRIENDS.MARK_NOTIFICATIONS_SEEN, {
            method: "POST",
            body: JSON.stringify({ section: "FRIEND_REQUESTS" }),
          });
        } else if (activeTab === "sent") {
          await apiRequest(API.FRIENDS.MARK_NOTIFICATIONS_SEEN, {
            method: "POST",
            body: JSON.stringify({ section: "SENT_REQUESTS" }),
          });
        }
        scheduleNotificationBadge();
      } catch {
        /* optional endpoint — lists may already mark seen */
      }
    };
    run();
  }, [activeTab, scheduleNotificationBadge]);

  const loadMore = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || loadingMore) return;
    const filterParam = msgFilter || undefined;

    if (activeTab === "inbox" && inboxHasMore && inboxCursor) {
      setLoadingMore(true);
      try {
        const data = await fetchJson(
          API.FRIENDS.getInboxConversationsUrl({
            limit: LIST_LIMIT,
            cursor: inboxCursor,
            filter: filterParam,
          })
        );
        const next = (data?.conversations || []).filter(shouldShowInboxConversation);
        setInboxList((prev) => sortByLatest(dedupeAppend(prev, next)));
        setInboxCursor(data?.nextCursor);
        setInboxHasMore(Boolean(data?.hasMore));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    if (activeTab === "requests" && requestsHasMore && requestsCursor) {
      setLoadingMore(true);
      try {
        const recvData = await fetchJson(
          API.FRIENDS.getReceivedRequestsUrl({
            limit: LIST_LIMIT,
            cursor: requestsCursor,
            filter: filterParam,
          })
        );
        const next = (recvData?.conversations || []).filter(shouldShowSentReceivedApiRow);
        setRequestsList((prev) => sortByLatest(dedupeAppend(prev, next)));
        setRequestsCursor(recvData?.nextCursor);
        setRequestsHasMore(Boolean(recvData?.hasMore));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    if (activeTab === "sent" && sentHasMore && sentCursor) {
      setLoadingMore(true);
      try {
        const sentConvData = await fetchJson(
          API.FRIENDS.getSentRequestsUrl({
            limit: LIST_LIMIT,
            cursor: sentCursor,
            filter: filterParam,
          })
        );
        const next = (sentConvData?.conversations || []).filter(shouldShowSentReceivedApiRow);
        setSentList((prev) => sortByLatest(dedupeAppend(prev, next)));
        setSentCursor(sentConvData?.nextCursor);
        setSentHasMore(Boolean(sentConvData?.hasMore));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMore(false);
      }
    }
  }, [
    activeTab,
    msgFilter,
    inboxHasMore,
    inboxCursor,
    requestsHasMore,
    requestsCursor,
    sentHasMore,
    sentCursor,
    loadingMore,
  ]);

  const markReadForPeer = useCallback(
    async (otherUserId) => {
      if (!otherUserId) return;
      try {
        const res = await fetch(API.FRIENDS.MARK_MESSAGES_READ(otherUserId), {
          method: "POST",
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          // Avoid full loadLists here — it fights the open thread every poll and causes badge flicker.
          scheduleNotificationBadge();
        }
      } catch (e) {
        console.warn("[Inbox] markRead", e);
      }
    },
    [scheduleNotificationBadge]
  );

  const computeSidebarUnread = useCallback((conversation, convKey, selected) => {
    if (selected) return 0;
    const stored = readStoredLastSeen(convKey);
    const lastSeenMs =
      clientLastSeenAtByConvRef.current[convKey] ?? stored?.lastSeenAtMs ?? null;
    if (lastSeenMs == null && !stored) {
      return Math.max(0, Math.floor(Number(conversation.unreadCount || 0)));
    }
    const lm = conversation.lastMessage;
    if (!lm) return 0;
    const me = currentUserId != null ? String(currentUserId) : null;
    const lmFrom = lm.fromUserId != null ? String(lm.fromUserId) : null;
    if (me && lmFrom && lmFrom === me) return 0;
    if (
      stored?.lastSeenMessageId != null &&
      lm.id != null &&
      String(lm.id) === String(stored.lastSeenMessageId)
    ) {
      return 0;
    }
    const lmT = new Date(lm.createdAt || 0).getTime();
    if (Number.isNaN(lmT)) {
      return Math.max(0, Math.floor(Number(conversation.unreadCount || 0)));
    }
    if (lastSeenMs != null && lmT <= lastSeenMs) return 0;
    const cu = clientUnreadByConv[convKey] ?? 0;
    return Math.max(cu, 1);
  }, [clientUnreadByConv, currentUserId]);

  const loadThreadMessages = useCallback(
    async (chat) => {
      if (!chat) {
        setMessages([]);
        setThreadNextCursor(undefined);
        setThreadHasMore(false);
        return;
      }
      const cid = chat.conversationId;
      const reqId =
        chat.followRequestId ||
        chat.outgoingFriendRequestId ||
        (String(chat.conversationId || "").startsWith("pending_fr_")
          ? String(chat.conversationId).replace("pending_fr_", "")
          : null) ||
        (String(chat.conversationId || "").startsWith("outgoing_fr_")
          ? String(chat.conversationId).replace("outgoing_fr_", "")
          : null);

      setThreadNextCursor(undefined);
      setThreadHasMore(false);

      try {
        if (!isSyntheticConversationId(cid)) {
          const data = await apiRequest(
            API.FRIENDS.GET_CONVERSATION_MESSAGES(cid, { limit: THREAD_MSG_LIMIT })
          );
          const msgs = data?.messages || [];
          setMessages(msgs);
          setThreadNextCursor(data?.nextCursor);
          setThreadHasMore(Boolean(data?.hasMore));
          // Switch this conversation to client-side unread tracking.
          // Set last-seen to the newest loaded message; persist so refresh does not show stale server totals.
          const cidStr = String(cid);
          if (msgs?.length) {
            const best = msgs.reduce((a, b) => {
              const ta = new Date(a.createdAt || 0).getTime();
              const tb = new Date(b.createdAt || 0).getTime();
              return tb >= ta ? b : a;
            });
            const maxMs = new Date(best.createdAt || 0).getTime();
            clientLastSeenAtByConvRef.current[cidStr] = Number.isNaN(maxMs) ? Date.now() : maxMs;
            writeStoredLastSeen(cidStr, {
              lastSeenAtMs: clientLastSeenAtByConvRef.current[cidStr],
              lastSeenMessageId: best?.id ?? null,
            });
          } else {
            const now = Date.now();
            clientLastSeenAtByConvRef.current[cidStr] = now;
            writeStoredLastSeen(cidStr, { lastSeenAtMs: now, lastSeenMessageId: null });
          }
          setClientUnreadByConv((prev) => ({ ...prev, [cidStr]: 0 }));
          await markReadForPeer(chat.otherUser?.id || chat.otherUserId);
          return;
        }
        if (reqId && (chat.isFollowRequest || chat.isOutgoingFriendRequest)) {
          const list = await apiRequest(API.FRIENDS.GET_REQUEST_MESSAGES(reqId));
          const arr = Array.isArray(list) ? list : [];
          setMessages(arr);
          if (!chat.isOutgoingFriendRequest) {
            await markReadForPeer(chat.otherUser?.id || chat.otherUserId);
          }
          return;
        }
        setMessages([]);
      } catch (e) {
        console.error("[Inbox] loadThreadMessages", e);
        setMessages([]);
        setThreadNextCursor(undefined);
        setThreadHasMore(false);
      }
    },
    [markReadForPeer]
  );

  const loadOlderThreadMessages = useCallback(async () => {
    if (!activeChat || loadingThreadOlder || !threadNextCursor || !threadHasMore) return;
    const cid = activeChat.conversationId;
    if (isSyntheticConversationId(cid)) return;
    const root = messagesScrollRef.current;
    if (root) {
      pendingThreadScrollRestoreRef.current = {
        scrollHeight: root.scrollHeight,
        scrollTop: root.scrollTop,
      };
    } else {
      pendingThreadScrollRestoreRef.current = null;
    }
    skipScrollToBottomRef.current = true;

    setLoadingThreadOlder(true);
    try {
      const data = await apiRequest(
        API.FRIENDS.GET_CONVERSATION_MESSAGES(cid, {
          limit: THREAD_MSG_LIMIT,
          cursor: threadNextCursor,
        })
      );
      const older = data?.messages || [];
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...older.filter((m) => m.id && !seen.has(m.id)), ...prev];
        return merged;
      });
      setThreadNextCursor(data?.nextCursor);
      setThreadHasMore(Boolean(data?.hasMore));
    } catch (e) {
      console.error("[Inbox] loadOlderThreadMessages", e);
      pendingThreadScrollRestoreRef.current = null;
      skipScrollToBottomRef.current = false;
    } finally {
      setLoadingThreadOlder(false);
    }
  }, [activeChat, loadingThreadOlder, threadNextCursor, threadHasMore]);

  useEffect(() => {
    if (activeChat) loadThreadMessages(activeChat);
  }, [activeChat, loadThreadMessages]);

  activeChatRef.current = activeChat;
  currentUserIdRef.current = currentUserId;
  loadListsRef.current = loadLists;
  loadNotificationBadgeRef.current = scheduleNotificationBadge;
  markReadForPeerRef.current = markReadForPeer;

  const connectFriendsWs = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "";
    if (!token) return;
    const base = API?.FRIENDS_WS?.WS_URL;
    if (!base) return;
    if (wsRef.current && (wsRef.current.readyState === 0 || wsRef.current.readyState === 1)) return;

    const wsUrlWithAuth = `${base}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;

    if (wsHeartbeatRef.current) clearInterval(wsHeartbeatRef.current);
    wsHeartbeatRef.current = setInterval(() => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping", data: { at: Date.now() } }));
      } catch {
        // ignore
      }
    }, 20000);

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg?.type) return;

      if (msg.type === "ws:ready") {
        if (msg.data?.ok) wsReconnectAttemptRef.current = 0;
        return;
      }

      if (msg.type === "friend:message" && msg.data) {
        const m = msg.data;
        const uid = currentUserIdRef.current;
        const isIncoming = String(m.toUserId) === String(uid);
        const activeNow = activeChatRef.current;
        const activeCidNow = activeNow?.conversationId || activeNow?.rowKey;
        const isActiveIncoming =
          isIncoming && activeCidNow && String(activeCidNow) === String(m.conversationId);

        const msgKey =
          m.id != null
            ? `id:${String(m.id)}`
            : `k:${m.fromUserId}:${m.toUserId}:${m.conversationId}:${m.createdAt}:${m.messageType}:${m.message || ""}:${m.giftId || ""}:${m.giftAmount || ""}`;
        if (seenWsMessageKeysRef.current.has(msgKey)) return;
        seenWsMessageKeysRef.current.add(msgKey);

        // Client-side unread: once we've opened a conversation, badge is driven by
        // incoming messages received after the last time we opened it.
        const convKey = String(m.conversationId);
        const lastSeenAtMs =
          clientLastSeenAtByConvRef.current[convKey] ??
          readStoredLastSeen(convKey)?.lastSeenAtMs ??
          null;
        if (
          isIncoming &&
          lastSeenAtMs != null &&
          !isActiveIncoming &&
          convKey &&
          !isSyntheticConversationId(convKey)
        ) {
          const t = new Date(m.createdAt || 0).getTime();
          if (!Number.isNaN(t) && t > lastSeenAtMs) {
            setClientUnreadByConv((prev) => ({
              ...prev,
              [convKey]: (prev[convKey] ?? 0) + 1,
            }));
          }
        }

        setMessages((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          if (m.id && seen.has(m.id)) return prev;
          if (!m.id) {
            const key = `${m.fromUserId}:${m.toUserId}:${m.createdAt}:${m.messageType}:${m.message || ""}`;
            const has = prev.some(
              (x) =>
                `${x.fromUserId}:${x.toUserId}:${x.createdAt}:${x.messageType}:${x.message || ""}` === key
            );
            if (has) return prev;
          }
          const ac = activeChatRef.current;
          const activeCid = ac?.conversationId || ac?.rowKey;
          if (!activeCid || String(activeCid) !== String(m.conversationId)) return prev;
          return [...prev, { ...m, isRead: m.toUserId === uid ? false : true }];
        });

        const rawUnread = m.unreadCountForConversation;
        const hasServerUnread =
          rawUnread !== undefined && rawUnread !== null && !Number.isNaN(Number(rawUnread));
        const nextUnread = hasServerUnread ? Math.max(0, Math.floor(Number(rawUnread))) : null;

        const bumpList = (setter) => {
          let found = false;
          setter((prev) => {
            const next = prev.map((c) => {
              const cid = c.conversationId || c.id;
              if (String(cid) !== String(m.conversationId)) return c;
              found = true;
              const mergedUnread = isActiveIncoming
                ? 0
                : nextUnread != null
                  ? nextUnread
                  : Number(c.unreadCount || 0);
              return {
                ...c,
                lastMessage: {
                  id: m.id,
                  fromUserId: m.fromUserId,
                  message: m.message,
                  messageType: m.messageType,
                  giftId: m.giftId,
                  giftAmount: m.giftAmount,
                  createdAt: m.createdAt,
                },
                lastMessageAt: m.createdAt,
                unreadCount: mergedUnread,
              };
            });
            return sortByLatest(next);
          });
          return found;
        };

        const inInbox = bumpList(setInboxList);
        const inReq = bumpList(setRequestsList);
        const inSent = bumpList(setSentList);

        const loadListsFn = loadListsRef.current;
        const scheduleNotifFn = loadNotificationBadgeRef.current;
        const markReadFn = markReadForPeerRef.current;

        if (!hasServerUnread && (inInbox || inReq || inSent)) {
          if (wsListSyncTimerRef.current) clearTimeout(wsListSyncTimerRef.current);
          wsListSyncTimerRef.current = setTimeout(() => {
            wsListSyncTimerRef.current = null;
            loadListsFn?.({ quiet: true });
          }, 350);
        }

        if (!inInbox && !inReq && !inSent) {
          loadListsFn?.({ quiet: true });
        }

        if (isIncoming) {
          scheduleNotifFn?.();
        }

        const ac2 = activeChatRef.current;
        const activeCid2 = ac2?.conversationId || ac2?.rowKey;
        if (activeCid2 && String(activeCid2) === String(m.conversationId) && isIncoming) {
          const clearForConv = (setter) =>
            setter((prev) =>
              prev.map((c) =>
                String(c.conversationId || c.id) === String(m.conversationId)
                  ? { ...c, unreadCount: 0 }
                  : c
              )
            );
          clearForConv(setInboxList);
          clearForConv(setRequestsList);
          clearForConv(setSentList);
          void markReadFn?.(ac2?.otherUserId || ac2?.otherUser?.id);
        }

      }

      if (msg.type === "friend:refresh") {
        loadListsRef.current?.({ quiet: true, skipNotificationBadge: true });
        loadNotificationBadgeRef.current?.();
      }

      if (msg.type === "friend:typing" && msg.data) {
        const t = msg.data;
        const ac = activeChatRef.current;
        const activeCid = ac?.conversationId || ac?.rowKey;
        if (!activeCid || String(activeCid) !== String(t.conversationId)) return;
        if (String(t.fromUserId) !== String(ac?.otherUserId || ac?.otherUser?.id)) return;
        setPeerTyping(Boolean(t.isTyping));
        // auto-clear if we stop receiving typing pings
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setPeerTyping(false), 2500);
      }

      if (msg.type === "friend:read" && msg.data) {
        // Clear counts on read-receipt hint; server remains source of truth via periodic loadLists.
        const other = msg.data?.fromUserId;
        if (!other) return;
        const clearForOther = (setter) =>
          setter((prev) =>
            prev.map((c) => (String(c.otherUserId) === String(other) ? { ...c, unreadCount: 0 } : c))
          );
        clearForOther(setInboxList);
        clearForOther(setRequestsList);
        clearForOther(setSentList);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (wsHeartbeatRef.current) {
        clearInterval(wsHeartbeatRef.current);
        wsHeartbeatRef.current = null;
      }
      // Reconnect with backoff
      const n = Math.min(8, wsReconnectAttemptRef.current + 1);
      wsReconnectAttemptRef.current = n;
      const delay = Math.min(15000, 500 * 2 ** n);
      if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = setTimeout(() => connectFriendsWsRef.current?.(), delay);
    };
    ws.onerror = () => {
      // leave polling fallback in place
    };
  }, []);

  // Avoid self-referential hook dependencies (used by reconnect timer).
  useEffect(() => {
    connectFriendsWsRef.current = connectFriendsWs;
  }, [connectFriendsWs]);

  // Instant messaging over WebSocket (same style as streaming-service: JWT as query param).
  useEffect(() => {
    connectFriendsWs();

    return () => {
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      if (wsListSyncTimerRef.current) {
        clearTimeout(wsListSyncTimerRef.current);
        wsListSyncTimerRef.current = null;
      }
      if (wsHeartbeatRef.current) {
        clearInterval(wsHeartbeatRef.current);
        wsHeartbeatRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
    // Intentionally do not depend on activeChat; single socket for screen lifetime.
  }, [connectFriendsWs]);

  // Reset typing indicator when switching chats.
  useEffect(() => {
    setPeerTyping(false);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [activeChat?.rowKey]);

  const emitTyping = useCallback(
    (isTyping) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== 1) return;
      if (!activeChat?.conversationId || !activeChat?.otherUserId) return;
      const now = Date.now();
      // throttle
      if (now - lastTypingSentAtRef.current < 300 && isTyping) return;
      lastTypingSentAtRef.current = now;
      try {
        ws.send(
          JSON.stringify({
            type: "friend:typing",
            data: {
              conversationId: activeChat.conversationId,
              otherUserId: activeChat.otherUserId,
              isTyping: Boolean(isTyping),
            },
          })
        );
      } catch {
        // ignore
      }
    },
    [activeChat?.conversationId, activeChat?.otherUserId]
  );

  // Near-real-time messaging: poll thread + list while a chat is open.
  // This keeps the open conversation updated without requiring refresh,
  // and keeps unread counts in sync.
  useEffect(() => {
    if (!activeChat) return;

    // Always clear any previous poll.
    if (threadPollRef.current) {
      clearInterval(threadPollRef.current);
      threadPollRef.current = null;
    }

    const tick = async () => {
      try {
        await loadThreadMessages(activeChat);
        // Do not hit /notifications/count every poll — friend-service limits ~60/min.
        await loadLists({ quiet: true, skipNotificationBadge: true });
      } catch {
        // ignore polling errors; UI should remain usable
      }
    };

    // Kick once immediately, then poll.
    tick();
    threadPollRef.current = setInterval(tick, 5000);

    return () => {
      if (threadPollRef.current) {
        clearInterval(threadPollRef.current);
        threadPollRef.current = null;
      }
    };
  }, [activeChat?.rowKey, loadThreadMessages, loadLists]);

  // When returning to the tab, refresh messages/unreads.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (activeChat) void loadThreadMessages(activeChat).catch(() => {});
      void loadLists({ quiet: true, skipNotificationBadge: true }).catch(() => {});
      scheduleNotificationBadge();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [activeChat, loadThreadMessages, loadLists, scheduleNotificationBadge]);

  useEffect(() => {
    if (!activeChat?.rowKey) return;
    const oid = activeChat.otherUserId || activeChat.otherUser?.id;
    if (!oid) return;
    const rk = activeChat.rowKey;
    let cancelled = false;
    enrichUser(oid).then((u) => {
      if (cancelled) return;
      setActiveChat((prev) =>
        prev && prev.rowKey === rk ? { ...prev, otherUser: { ...prev.otherUser, ...u } } : prev
      );
    });
    return () => {
      cancelled = true;
    };
  }, [activeChat?.rowKey, enrichUser]);

  useLayoutEffect(() => {
    const pending = pendingThreadScrollRestoreRef.current;
    if (!pending) return;
    pendingThreadScrollRestoreRef.current = null;

    const sh0 = pending.scrollHeight;
    const st0 = pending.scrollTop;

    const sync = () => {
      const node = messagesScrollRef.current;
      if (!node) return;
      node.scrollTop = st0 + (node.scrollHeight - sh0);
    };

    sync();
    const outer = requestAnimationFrame(() => {
      sync();
      requestAnimationFrame(sync);
    });
    return () => cancelAnimationFrame(outer);
  }, [messages]);

  useEffect(() => {
    if (skipScrollToBottomRef.current) {
      skipScrollToBottomRef.current = false;
      return;
    }
    const root = messagesScrollRef.current;
    if (!root || messages.length === 0) return;
    root.scrollTo({ top: root.scrollHeight, behavior: "auto" });
  }, [messages]);

  const cleanRequestId = (id) => {
    if (typeof id !== "string") return id;
    if (id.startsWith("follow_")) return id.replace("follow_", "");
    return id;
  };

  const handleAcceptRequest = async (requestId) => {
    const clean = cleanRequestId(requestId);
    if (!clean) return;
    try {
      await apiRequest(API.FRIENDS.ACCEPT_FRIEND_REQUEST(clean), { method: "POST", body: "{}" });
      setActiveChat(null);
      await loadLists();
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to accept");
    }
  };

  const handleRejectRequest = async (requestId) => {
    const clean = cleanRequestId(requestId);
    if (!clean) return;
    try {
      await apiRequest(API.FRIENDS.REJECT_FRIEND_REQUEST(clean), { method: "POST", body: "{}" });
      setActiveChat(null);
      await loadLists();
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to reject");
    }
  };

  const sendOfflineFriendRequest = async (toUserId) => {
    if (!toUserId || sendFriendBusy) return;
    setSendFriendBusy(true);
    try {
      await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
        method: "POST",
        body: JSON.stringify({ toUserId }),
      });
      await loadLists();
    } catch (e) {
      alert(e.message || "Could not send friend request");
    } finally {
      setSendFriendBusy(false);
    }
  };

  const sendMessage = async (giftData = null) => {
    if (!activeChat || sending) return;
    if (!newMessage.trim() && !giftData) return;

    const realCid = activeChat.conversationId;
    const textOnlyOk =
      activeChat.isFriend ||
      giftData ||
      canSendTextOnlyNonFriend(messages, currentUserId);
    if (!textOnlyOk) {
      alert("Further messages need a gift. Tap the gift button.");
      return;
    }

    const body = {
      message: newMessage.trim() || null,
      ...(giftData && { giftId: giftData.id, giftAmount: giftData.price }),
    };

    try {
      setSending(true);

      if (!isSyntheticConversationId(realCid)) {
        const res = await apiRequest(API.FRIENDS.SEND_MESSAGE(realCid), {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (res?.promotedToInbox) {
          setActiveTab("inbox");
        }
        if (typeof res?.newBalance === "number") {
          setWalletCoins(res.newBalance);
        } else {
          refreshWallet();
        }
      } else if (activeChat.outgoingFriendRequestId) {
        const res = await apiRequest(API.FRIENDS.SEND_REQUEST_MESSAGE(activeChat.outgoingFriendRequestId), {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (typeof res?.newBalance === "number") {
          setWalletCoins(res.newBalance);
        } else {
          refreshWallet();
        }
      } else {
        alert(
          "You can’t send a message here yet. Accept the friend request, or open a conversation thread."
        );
        return;
      }

      setNewMessage("");
      setIsGiftModalOpen(false);
      await loadThreadMessages(activeChat);
      await loadLists({ quiet: true });
    } catch (e) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const currentList =
    activeTab === "inbox" ? inboxList : activeTab === "requests" ? requestsList : sentList;

  const filteredConversationList = useMemo(
    () => currentList.filter((c) => conversationMatchesSearch(c, conversationSearch)),
    [currentList, conversationSearch]
  );

  useEffect(() => {
    const rk = activeChat?.rowKey;
    if (rk == null || rk === "") return;
    const list =
      activeTab === "inbox" ? inboxList : activeTab === "requests" ? requestsList : sentList;
    const row = list.find((c) => String(c.conversationId || c.id) === String(rk));
    if (!row) return;
    setActiveChat((prev) => {
      if (!prev || String(prev.rowKey) !== String(rk)) return prev;
      const nu = row.userStatus;
      const nb = row.isBroadcasting;
      const bu = row.broadcastUrl;
      if (prev.userStatus === nu && prev.isBroadcasting === nb && prev.broadcastUrl === bu) return prev;
      return { ...prev, userStatus: nu, isBroadcasting: nb, broadcastUrl: bu };
    });
  }, [inboxList, requestsList, sentList, activeTab, activeChat?.rowKey]);

  const requestsTabCount =
    (notif?.breakdown?.receivedRequests ?? 0) + (notif?.breakdown?.friendRequests ?? 0);

  const listHasMore =
    activeTab === "inbox" ? inboxHasMore : activeTab === "requests" ? requestsHasMore : sentHasMore;

  const openRow = (row) => {
    const cid = row.conversationId || row.id;
    const followId =
      row.followRequestId ||
      (typeof cid === "string" && cid.startsWith("follow_") ? cid.replace("follow_", "") : null) ||
      (typeof row.id === "string" && row.id.startsWith("pending_fr_")
        ? row.id.replace("pending_fr_", "")
        : null);
    const outgoingId =
      row.outgoingFriendRequestId ||
      (typeof row.id === "string" && row.id.startsWith("outgoing_fr_")
        ? row.id.replace("outgoing_fr_", "")
        : null);

    // Optimistic unread reset: as soon as user opens the conversation, clear the bubble count locally.
    // Backend mark-read runs inside loadThreadMessages → markReadForPeer → loadLists.
    const clearUnread = (setter) =>
      setter((prev) =>
        prev.map((c) => {
          const k = String(c.conversationId || c.id);
          return String(k) === String(cid) ? { ...c, unreadCount: 0 } : c;
        })
      );
    if (activeTab === "inbox") clearUnread(setInboxList);
    else if (activeTab === "requests") clearUnread(setRequestsList);
    else clearUnread(setSentList);

    setActiveChat({
      rowKey: cid,
      conversationId: cid,
      otherUser: row.otherUser,
      otherUserId: row.otherUserId,
      isFriend: Boolean(row.isFriend),
      isFollowRequest: Boolean(row.isFollowRequest),
      isOutgoingFriendRequest: Boolean(row.isOutgoingFriendRequest),
      followRequestId: followId || null,
      outgoingFriendRequestId: outgoingId || null,
      unreadCount: 0,
      userStatus: row.userStatus,
      isBroadcasting: row.isBroadcasting,
      broadcastUrl: row.broadcastUrl,
    });
    // Mark-as-read immediately on open as a safety net.
    if (!isSyntheticConversationId(cid)) {
      void markReadForPeer(row.otherUser?.id || row.otherUserId);
    }
    // Do not set viewport unread here — only after loadThreadMessages + markRead succeeds.
    // Otherwise a click without a loaded thread forces 0 and hides real server unread.
  };

  const showRecipientFollowActions =
    activeTab === "requests" &&
    activeChat &&
    activeChat.isFollowRequest &&
    !activeChat.isOutgoingFriendRequest &&
    messages.length === 0;

  const showComposer =
    activeChat &&
    !showRecipientFollowActions &&
    (activeTab === "inbox" ||
      !activeChat.isFollowRequest ||
      activeChat.isOutgoingFriendRequest ||
      messages.length > 0 ||
      !isSyntheticConversationId(activeChat.conversationId));

  const textInputLocked =
    showComposer &&
    !activeChat?.isFriend &&
    !canSendTextOnlyNonFriend(messages, currentUserId);

  const filterToggle = (key) => (
    <button
      type="button"
      onClick={() => setMsgFilter((f) => (f === key ? MsgFilter.ALL : key))}
      className={`flex shrink-0 items-center justify-center w-11 h-11 min-w-[2.75rem] min-h-[2.75rem] rounded-full border transition-all text-white ${
        msgFilter === key ? "bg-white/25 border-white" : "border-white/30 bg-white/5"
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

  const otherProfile = activeChat?.otherUser;
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

  const openBroadcast = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const headerUserStatus = activeChat?.userStatus;
  const headerLive =
    activeChat?.broadcastUrl &&
    (activeChat.isBroadcasting || headerUserStatus === "broadcasting");

  const peerId = activeChat?.otherUserId || otherProfile?.id || null;

  const handleUnfriendPeer = async () => {
    if (!peerId || !activeChat?.isFriend || threadActionBusy) return;
    const label = otherProfile?.username || "this user";
    if (!window.confirm(`Remove ${label} as a friend? You can send a new request later.`)) return;
    setThreadActionBusy(true);
    try {
      await apiRequest(API.FRIENDS.UNFRIEND(peerId), { method: "POST", body: "{}" });
      setThreadMenuOpen(false);
      setActiveChat((prev) => (prev ? { ...prev, isFriend: false } : prev));
      await loadLists({ quiet: true, skipNotificationBadge: true });
      scheduleNotificationBadge();
    } catch (e) {
      alert(e.message || "Could not unfriend");
    } finally {
      setThreadActionBusy(false);
    }
  };

  const handleBlockPeer = async () => {
    if (!peerId || threadActionBusy) return;
    const label = otherProfile?.username || "this user";
    if (
      !window.confirm(
        `Block ${label}? They won’t be able to message you and pending requests with them will be closed.`
      )
    )
      return;
    setThreadActionBusy(true);
    try {
      await apiRequest(API.FRIENDS.BLOCK_USER(peerId), { method: "POST", body: "{}" });
      setThreadMenuOpen(false);
      setActiveChat(null);
      await loadLists();
      scheduleNotificationBadge();
    } catch (e) {
      alert(e.message || "Could not block user");
    } finally {
      setThreadActionBusy(false);
    }
  };

  return (
    <div className="h-screen w-full relative text-white font-sans overflow-hidden">
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />

      <div className="flex h-full min-h-0 flex-col md:py-12 md:px-12 lg:px-24 md:max-w-6xl md:mx-auto relative z-10 font-[family-name:var(--font-otomanopee)]">
        <div
          className={`flex items-center justify-between gap-3 text-xl md:text-3xl font-semibold p-4 md:p-0 md:mb-4 ${
            activeChat ? "md:flex hidden" : "flex"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className=" border-white border-1 rounded-full p-2" onClick={() => router.push("/")}>
              <FaArrowLeftLong className="text-xl md:text-xl cursor-pointer" />
            </div>
            <span className="text-sm">Messages</span>
          </div>
          <button
            type="button"
            onClick={() => {
              router.push("/inbox/friends-wall");
            }}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 border border-white/80 px-4 py-1.5 rounded-full text-sm backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <span className="grid place-items-center w-6 h-6 text-[10px]">
              <img src="./wall.svg" alt="wall" />
            </span>
            Friend Wall
          </button>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end text-[10px] font-bold text-white/80">
              {walletCoins != null && <span>{walletCoins} coins</span>}
              <span className="text-white/50 font-normal">1st msg ~{firstMessageCost} coins</span>
            </div>
            <img src="./LOGO.png" alt="Logo" className="w-24 md:w-32" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 w-full flex-col rounded-[48px] ring-2 ring-white/50 ring-offset-2 ring-offset-purple-900/90 overflow-hidden bg-transparent md:h-[78vh] md:flex-row">
          <div
            className={`min-h-0 md:w-[40%] w-full md:p-6 p-4
            ${activeChat ? "hidden md:flex" : "flex"} flex flex-col`}
          >
            <div className="w-full py-6 text-white space-y-4">
              <div className="flex flex-col gap-3 w-full">
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
                    onClick={() => {
                      setActiveTab("inbox");
                      setActiveChat(null);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm shrink-0 ${
                      activeTab === "inbox"
                        ? "bg-white/20 border border-white"
                        : "border border-transparent"
                    }`}
                  >
                    Inbox
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("requests");
                      setActiveChat(null);
                    }}
                    className={`px-5 py-1.5 rounded-full text-sm shrink-0 ${
                      activeTab === "requests"
                        ? "bg-white/20 border border-white"
                        : "border border-transparent "
                    }`}
                  >
                    Requests{" "}
                    <span className="text-xs font-thin">
                      ({notif ? requestsTabCount : "—"})
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between ">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("sent");
                    setActiveChat(null);
                  }}
                  className={`flex items-center border rounded-full p-3 gap-2 transition-all active:scale-95 ${
                    activeTab === "sent" ? "bg-white/20 border-white" : "border-white/50"
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
                      const unreadCountDisplay = computeSidebarUnread(
                        conversation,
                        convKey,
                        selected
                      );
                      const unread = unreadCountDisplay > 0;
                      const st = conversation.userStatus;
                      const live = Boolean(
                        conversation.broadcastUrl &&
                          (conversation.isBroadcasting || st === "broadcasting")
                      );
                      return (
                        <div
                          key={cid}
                          role="button"
                          tabIndex={0}
                          onClick={() => openRow(conversation)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRow(conversation);
                            }
                          }}
                          className={`flex cursor-pointer items-center gap-4 border-b border-white/20 pb-4 text-left px-2 rounded-xl transition-colors ${
                            unread ? "bg-purple-500/25 ring-1 ring-yellow-400/50" : "hover:bg-white/5"
                          } ${selected ? "bg-white/10" : ""}`}
                        >
                          <div className="relative h-12 w-12 shrink-0">
                            <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10">
                              <Image
                                src={conversation.otherUser?.displayPictureUrl || "/assets/ico.png"}
                                alt={conversation.otherUser?.username || "User"}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
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
                                  {unreadCountDisplay > 9 ? "9+" : unreadCountDisplay}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-white/50 truncate font-light mt-0.5">
                              {lastMessagePreview(conversation)}
                            </div>
                          </div>
                        </div>
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

          <div
            className={`min-h-0 md:w-[60%] w-full h-full flex flex-col p-2
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {activeChat ? (
              <>
                <div className="border border-white/50 rounded-[50px] flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between md:px-6 md:p-2 md:mt-6 bg-black/20 md:bg-transparent overflow-visible">
                    <div className="flex items-center gap-3 bg-purple-600/20 border border-white p-1.5 pr-6 rounded-full min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setActiveChat(null)}
                        className="md:hidden text-2xl pl-2 flex-shrink-0"
                      >
                        <IoChevronBack />
                      </button>

                      <div className="relative h-12 w-12 shrink-0 overflow-visible">
                        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white">
                          <Image
                            src={otherProfile?.displayPictureUrl || "/assets/ico.png"}
                            alt="User"
                            fill
                            sizes="48px"
                            className="object-cover rounded-full"
                          />
                        </div>
                        {headerUserStatus === "online" && (
                          <span
                            className="pointer-events-none absolute bottom-0 right-0 z-10 h-3 w-3 translate-x-[1px] translate-y-[1px] rounded-full border-2 border-[#1a0a2e] bg-emerald-400 shadow-sm"
                            title="Online"
                            aria-hidden
                          />
                        )}
                        {headerLive && (
                          <button
                            type="button"
                            title="Watch live"
                            onClick={(e) => openBroadcast(e, activeChat.broadcastUrl)}
                            className="absolute -right-1 -top-1 z-10 rounded bg-pink-600 px-1 text-[8px] font-black uppercase leading-none shadow"
                          >
                            LIVE
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-lg text-white leading-tight truncate flex items-center gap-2">
                          {otherProfile?.username || "User"}
                          {(activeTab === "inbox" || activeTab === "requests") &&
                            !activeChat.isFriend &&
                            otherProfile?.id && (
                              <button
                                type="button"
                                title="Add friend"
                                disabled={sendFriendBusy}
                                onClick={() => sendOfflineFriendRequest(otherProfile.id)}
                                className="p-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex-shrink-0"
                              >
                                <TiUserAdd className="text-lg" />
                              </button>
                            )}
                        </span>
                        <div className="flex items-center gap-1 text-white/80 text-xs">
                          <IoLocationOutline className="text-white flex-shrink-0" />
                          <span className="truncate">
                            {otherProfile?.preferredCity || "—"}
                            {ageFromDob(otherProfile?.dateOfBirth)
                              ? ` · ${ageFromDob(otherProfile?.dateOfBirth)}`
                              : ""}
                          </span>
                        </div>
                        {peerTyping && (
                          <div
                            className="flex items-center gap-1.5 h-4"
                            aria-label="Typing indicator"
                            title="Typing"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        )}
                      </div>

                      {peerId && (
                        <div className="relative flex-shrink-0 self-center pr-1" ref={threadMenuRef}>
                          {threadActionBusy ? (
                            <span className="inline-flex px-2 text-xs text-white/45">…</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-expanded={threadMenuOpen}
                                aria-haspopup="menu"
                                onClick={() => setThreadMenuOpen((o) => !o)}
                                className="p-2 rounded-full text-white/85 hover:bg-white/15 transition-colors"
                                title="More actions"
                              >
                                <IoEllipsisVertical className="text-xl" aria-hidden />
                              </button>
                              {threadMenuOpen && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[11.5rem] rounded-xl border border-white/25 bg-neutral-950/95 backdrop-blur-md py-1 shadow-xl"
                                >
                                  {activeChat.isFriend && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => handleUnfriendPeer()}
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/10"
                                    >
                                      <FaUserMinus className="text-base opacity-85 shrink-0" aria-hidden />
                                      Unfriend
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleBlockPeer()}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/10"
                                  >
                                    <FaBan className="text-base opacity-85 shrink-0" aria-hidden />
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

                  {showRecipientFollowActions && (
                    <div className="px-6 py-4 flex gap-3 justify-center border-b border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          handleAcceptRequest(
                            activeChat.followRequestId ||
                              (String(activeChat.conversationId).startsWith("follow_")
                                ? String(activeChat.conversationId).replace("follow_", "")
                                : String(activeChat.conversationId).replace("pending_fr_", ""))
                          )
                        }
                        className="bg-[#d91e82] text-white text-sm font-bold px-6 py-2 rounded-full"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRejectRequest(
                            activeChat.followRequestId ||
                              (String(activeChat.conversationId).startsWith("follow_")
                                ? String(activeChat.conversationId).replace("follow_", "")
                                : String(activeChat.conversationId).replace("pending_fr_", ""))
                          )
                        }
                        className="bg-white/10 text-white text-sm font-bold px-6 py-2 rounded-full"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {textInputLocked && showComposer && (
                    <p className="px-6 pt-2 text-[11px] text-amber-200/90 font-medium">
                      You’ve sent a message here already — next sends need a gift (tap gift icon).
                    </p>
                  )}
                  {!activeChat.isFriend &&
                    showComposer &&
                    canSendTextOnlyNonFriend(messages, currentUserId) &&
                    walletCoins != null &&
                    walletCoins < firstMessageCost && (
                      <p className="px-6 pt-1 text-[11px] text-red-300/90">
                        Low balance: first text costs ~{firstMessageCost} coins.
                      </p>
                    )}

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
                                        <Image
                                          src="/gift/dimond.png"
                                          alt="coin"
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                      <span className="text-xs font-bold">{message.giftAmount || 0}</span>
                                    </div>
                                  </div>
                                )}

                                {message.message && (
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
                                    src={myAvatarUrl || localStorage.getItem("displayPictureUrl") || "/assets/avatar1.png"}
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
                </div>

                {showComposer && (
                  <>
                    <div className="px-4 md:px-6 pt-3 pb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-white/70 md:hidden">
                      {walletCoins != null ? (
                        <span>{walletCoins} coins</span>
                      ) : (
                        <span className="text-white/45">Wallet…</span>
                      )}
                      <span className="text-white/35">·</span>
                      <span>1st text ~{firstMessageCost} coins</span>
                    </div>
                    <div className="p-4 md:p-6 pt-1 md:pt-6 flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        placeholder={
                          textInputLocked ? "Send a gift to continue…" : "Type message"
                        }
                        value={newMessage}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNewMessage(v);
                          emitTyping(Boolean(v.trim()));
                          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                          // send "stop typing" shortly after user stops input
                          typingTimerRef.current = setTimeout(() => emitTyping(false), 900);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !textInputLocked) sendMessage();
                        }}
                        disabled={sending || textInputLocked}
                        className="w-full bg-white/5 backdrop-blur-md border border-white/60 rounded-[12px]  py-3 md:py-4 px-6 pr-14 text-white placeholder-white/40 focus:outline-none focus:border-white/90 transition-all shadow-inner disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => sendMessage()}
                        disabled={sending || textInputLocked || !newMessage.trim()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors disabled:opacity-30"
                      >
                        <IoSendSharp className="text-xl md:text-2xl" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsGiftModalOpen(true)}
                      className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center active:scale-95 transition-transform relative group "
                    >
                      <img
                        src="/circle.png"
                        alt="button-bg"
                        className="absolute inset-0 w-full h-full bg-pink-700 rounded-full object-contain group-hover:scale-105 transition-transform opacity-100"
                      />
                      <img
                        src="/giftboc.png"
                        alt="gift-icon"
                        className="relative w-6 h-6 md:w-8 md:h-8 object-contain group-hover:rotate-12 transition-transform"
                      />
                    </button>
                  </div>
                  </>
                )}

                <GiftModal
                  isOpen={isGiftModalOpen}
                  onClose={() => setIsGiftModalOpen(false)}
                  onSelectGift={(gift) => sendMessage(gift)}
                  catalogGifts={giftModalItems}
                  catalogLoading={giftsCatalogLoading}
                />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/50 md:rounded-[50px]">
                <div className="flex flex-1 items-center justify-center px-4 py-12">
                  <p className="text-center text-white/60">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
