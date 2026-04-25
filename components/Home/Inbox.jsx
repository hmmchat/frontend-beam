"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { API, apiRequest, getAuthHeaders } from "@/lib/api";
import { getNotificationCountThrottled } from "@/lib/notification-count";
import InboxHeader from "../inbox/InboxHeader";
import ConversationSidebar from "../inbox/ConversationSidebar";
import ThreadHeader from "../inbox/ThreadHeader";
import ThreadMessages from "../inbox/ThreadMessages";
import ThreadComposer from "../inbox/ThreadComposer";
import clsx from "clsx";

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

function fallbackPresetGiftImagePath(giftId) {
  if (!giftId || typeof giftId !== "string") return PRESET_GIFT_IMAGES[0];
  let h = 0;
  for (let i = 0; i < giftId.length; i++) {
    h = (Math.imul(31, h) + giftId.charCodeAt(i)) | 0;
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
    image:
      (g.imageUrl && String(g.imageUrl).trim()) ||
      fallbackPresetGiftImagePath(g.giftId),
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

function canSendTextOnlyNonFriend(messages, currentUserId) {
  if (!currentUserId) return true;
  const mine = messages.filter((m) => m.fromUserId === currentUserId);
  return mine.length === 0;
}

/** Backend infers GIF vs GIF_WITH_MESSAGE from `gif` + optional `message` — do not send `messageType` or null fields. */
function buildSendMessagePayload({
  trimmed,
  hasText,
  resolvedGift,
  resolvedGif,
}) {
  const body = {};
  if (hasText) body.message = trimmed;
  if (resolvedGift) {
    body.giftId = resolvedGift.id;
    body.giftAmount = resolvedGift.price;
  }
  if (resolvedGif) {
    const url = String(resolvedGif.url || resolvedGif.previewUrl || "").trim();
    const previewUrl = String(
      resolvedGif.previewUrl || resolvedGif.url || "",
    ).trim();
    if (!url || !previewUrl) {
      throw new Error("Could not send GIF (missing URL).");
    }
    body.gif = { url, previewUrl };
    const gid = resolvedGif.giphyId ?? resolvedGif.id;
    if (gid != null && gid !== "") {
      const s = String(gid);
      body.gif.id = s;
      body.gif.giphyId = s;
    }
    // Opt-in if your API requires explicit enum (default: server infers from `gif`)
    if (
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_GIF_SEND_MESSAGE_TYPE === "true"
    ) {
      body.messageType = hasText ? "GIF_WITH_MESSAGE" : "GIF";
    }
  }
  return body;
}

function dedupeAppend(existing, incoming) {
  const keys = new Set(existing.map((c) => String(c.conversationId || c.id)));
  const add = incoming.filter(
    (c) => !keys.has(String(c.conversationId || c.id)),
  );
  return [...existing, ...add];
}

function shouldShowInboxConversation(c) {
  if (!c) return false;
  if (c.isFriend) return true;
  return Boolean(c.lastMessage);
}

function shouldShowSentReceivedApiRow(c) {
  return Boolean(c?.lastMessage);
}

function lastMessagePreview(conv) {
  const lm = conv.lastMessage;
  if (!lm) {
    if (conv.isFollowRequest) return "Friend request · tap to respond";
    if (conv.isOutgoingFriendRequest)
      return "Friend request sent · no messages yet";
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
  if (t === "SQUAD_INVITE") return "Squad call invite";
  if (t === "SQUAD_INVITE_OUTCOME") return lm.message?.trim() || "Squad update";
  return lm.message || "Message";
}

function sortByLatest(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const tb = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

const INBOX_LAST_SEEN_PREFIX = "inbox:lastSeenMsgV2:";

function readStoredLastSeen(convId) {
  if (typeof window === "undefined" || convId == null || convId === "")
    return null;
  try {
    const raw = sessionStorage.getItem(INBOX_LAST_SEEN_PREFIX + String(convId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o == null || typeof o !== "object") return null;
    const lastSeenAtMs = Number(o.lastSeenAtMs);
    if (Number.isNaN(lastSeenAtMs)) return null;
    return {
      lastSeenAtMs,
      lastSeenMessageId:
        o.lastSeenMessageId != null ? String(o.lastSeenMessageId) : null,
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
        lastSeenMessageId:
          lastSeenMessageId != null ? String(lastSeenMessageId) : null,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function fetchNetworkMessage(err) {
  if (
    err instanceof TypeError &&
    (err.message === "Failed to fetch" || err.message === "Load failed")
  ) {
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
    if (res.status === 429)
      throw new Error(`${msg} — please wait a moment and try again.`);
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
  const [loadingThread, setLoadingThread] = useState(false);
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
  const [firstMessageCost, setFirstMessageCost] = useState(
    DEFAULT_FIRST_MSG_COST,
  );
  const [giftModalItems, setGiftModalItems] = useState(null);
  const [giftsCatalogLoading, setGiftsCatalogLoading] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [listLoadError, setListLoadError] = useState(null);
  /** In-thread product copy (replaces window.alert for errors / warnings). */
  const [threadProductMessage, setThreadProductMessage] = useState(null);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [threadActionBusy, setThreadActionBusy] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const [clientUnreadByConv, setClientUnreadByConv] = useState({});
  const [activePendingSquadInvitationIds, setActivePendingSquadInvitationIds] =
    useState(() => new Set());
  const refreshPendingSquadInvitationIdsRef = useRef(null);
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
  const activeChatRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const loadListsRef = useRef(null);
  const loadNotificationBadgeRef = useRef(null);
  const markReadForPeerRef = useRef(null);
  const wsListSyncTimerRef = useRef(null);
  const markReadWsDebounceRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);
  const pendingThreadScrollRestoreRef = useRef(null);
  const skipScrollToBottomRef = useRef(false);

  useEffect(() => {
    if (!threadProductMessage) return undefined;
    const t = setTimeout(() => setThreadProductMessage(null), 12000);
    return () => clearTimeout(t);
  }, [threadProductMessage]);

  useEffect(() => {
    setThreadProductMessage(null);
  }, [activeChat?.rowKey]);

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

  const userCacheRef = useRef({});

  const enrichUser = useCallback(async (userId) => {
    if (userCacheRef.current[userId]) return userCacheRef.current[userId];
    try {
      const data = await apiRequest(API.USERS.GET_USER(userId));
      const u = data?.user || {};
      const result = {
        id: userId,
        username: u.username || "User",
        displayPictureUrl: u.displayPictureUrl || null,
        preferredCity: u.preferredCity || "",
        dateOfBirth: u.dateOfBirth,
      };
      userCacheRef.current[userId] = result;
      return result;
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
      if (typeof data?.firstMessageCostCoins === "number")
        setFirstMessageCost(data.firstMessageCostCoins);
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
        const url = localStorage.getItem("displayPictureUrl");
        setMyAvatarUrl(url || null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const notifNextAllowedAtRef = useRef(0);
  const notifBadgeTimerRef = useRef(null);

  const scheduleNotificationBadge = useCallback((opts = {}) => {
    const minGapMs = 12000;
    const backoff429Ms = 60000;
    const force = opts.force === true;
    const fire = async () => {
      notifBadgeTimerRef.current = null;
      const now = Date.now();
      if (!force && now < notifNextAllowedAtRef.current) {
        const wait = notifNextAllowedAtRef.current - now + 50;
        notifBadgeTimerRef.current = window.setTimeout(fire, wait);
        return;
      }
      notifNextAllowedAtRef.current = now + minGapMs;
      try {
        const data = await getNotificationCountThrottled({
          force,
          minGapMs,
          backoff429Ms,
        });
        setNotif(data);
      } catch (e) {
        setNotif(null);
        const msg = e instanceof Error ? e.message : "";
        if (
          msg.includes("429") ||
          msg.includes("Rate limit") ||
          msg.includes("Too Many")
        ) {
          notifNextAllowedAtRef.current = Date.now() + backoff429Ms;
        }
      }
    };
    const now = Date.now();
    if (force || now >= notifNextAllowedAtRef.current) {
      if (notifBadgeTimerRef.current) {
        clearTimeout(notifBadgeTimerRef.current);
        notifBadgeTimerRef.current = null;
      }
      void fire();
      return;
    }
    if (notifBadgeTimerRef.current) return;
    notifBadgeTimerRef.current = window.setTimeout(
      fire,
      notifNextAllowedAtRef.current - now + 50,
    );
  }, []);

  useEffect(
    () => () => {
      if (notifBadgeTimerRef.current) {
        clearTimeout(notifBadgeTimerRef.current);
        notifBadgeTimerRef.current = null;
      }
    },
    [],
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
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      if (!quiet && inboxList.length === 0 && requestsList.length === 0 && sentList.length === 0) {
        setLoading(true);
      }
      try {
        setListLoadError(null);
        if (activeTab === "inbox") {
          const data = await fetchJson(
            API.FRIENDS.getInboxConversationsUrl({
              limit: LIST_LIMIT,
              filter: filterParam,
            }),
          );
          const inboxRows = (data?.conversations || []).filter(
            shouldShowInboxConversation,
          );
          setInboxList(sortByLatest(inboxRows));
          setInboxCursor(data?.nextCursor);
          setInboxHasMore(Boolean(data?.hasMore));
        } else if (activeTab === "requests") {
          const recvData = await fetchJson(
            API.FRIENDS.getReceivedRequestsUrl({
              limit: LIST_LIMIT,
              filter: filterParam,
            }),
          );
          let conversations = (recvData?.conversations || []).filter(
            shouldShowSentReceivedApiRow,
          );
          setRequestsCursor(recvData?.nextCursor);
          setRequestsHasMore(Boolean(recvData?.hasMore));
          if (
            filterParam !== MsgFilter.TEXT_ONLY &&
            filterParam !== MsgFilter.WITH_GIFT
          ) {
            const pendingRaw = await fetchJson(
              API.FRIENDS.GET_PENDING_REQUESTS,
              { headers },
            ).catch(() => []);
            const pendingArr = Array.isArray(pendingRaw) ? pendingRaw : [];
            const convOthers = new Set(
              conversations.map((c) => String(c.otherUserId)),
            );
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
                }),
            );
            conversations = [...conversations, ...pendingRows];
          }
          setRequestsList(sortByLatest(conversations));
        } else if (activeTab === "sent") {
          const sentConvData = await fetchJson(
            API.FRIENDS.getSentRequestsUrl({
              limit: LIST_LIMIT,
              filter: filterParam,
            }),
          );
          let conversations = (sentConvData?.conversations || []).filter(
            shouldShowSentReceivedApiRow,
          );
          setSentCursor(sentConvData?.nextCursor);
          setSentHasMore(Boolean(sentConvData?.hasMore));
          if (
            filterParam !== MsgFilter.TEXT_ONLY &&
            filterParam !== MsgFilter.WITH_GIFT
          ) {
            const sentFr = await fetchJson(
              API.FRIENDS.GET_SENT_FRIEND_REQUESTS,
              { headers },
            ).catch(() => []);
            const sentArr = Array.isArray(sentFr) ? sentFr : [];
            const convRecipients = new Set(
              conversations.map((c) => String(c.otherUserId)),
            );
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
                }),
            );
            conversations = [...conversations, ...extraRows];
          }
          setSentList(sortByLatest(conversations));
        }
        if (!skipNotificationBadge) scheduleNotificationBadge();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not load conversations.";
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
    [
      activeTab,
      msgFilter,
      router,
      resolveUserIdFromToken,
      scheduleNotificationBadge,
      enrichUser,
    ],
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
      if (threadMenuRef.current && !threadMenuRef.current.contains(e.target))
        setThreadMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [threadMenuOpen]);

  useEffect(() => {
    setThreadMenuOpen(false);
  }, [activeChat?.rowKey]);

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
        scheduleNotificationBadge({ force: true });
      } catch {
        /* optional endpoint */
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
          }),
        );
        const next = (data?.conversations || []).filter(
          shouldShowInboxConversation,
        );
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
          }),
        );
        const next = (recvData?.conversations || []).filter(
          shouldShowSentReceivedApiRow,
        );
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
          }),
        );
        const next = (sentConvData?.conversations || []).filter(
          shouldShowSentReceivedApiRow,
        );
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
        await apiRequest(API.FRIENDS.MARK_MESSAGES_READ(otherUserId), {
          method: "POST",
        });
        scheduleNotificationBadge({ force: true });
      } catch (e) {
        console.warn("[Inbox] markRead", e);
      }
    },
    [scheduleNotificationBadge],
  );

  const computeSidebarUnread = useCallback(
    (conversation, convKey, selected) => {
      if (selected) return 0;
      const stored = readStoredLastSeen(convKey);
      const lastSeenMs =
        clientLastSeenAtByConvRef.current[convKey] ??
        stored?.lastSeenAtMs ??
        null;
      if (lastSeenMs == null && !stored)
        return Math.max(0, Math.floor(Number(conversation.unreadCount || 0)));
      const lm = conversation.lastMessage;
      if (!lm) return 0;
      const me = currentUserId != null ? String(currentUserId) : null;
      const lmFrom = lm.fromUserId != null ? String(lm.fromUserId) : null;
      if (me && lmFrom && lmFrom === me) return 0;
      if (
        stored?.lastSeenMessageId != null &&
        lm.id != null &&
        String(lm.id) === String(stored.lastSeenMessageId)
      )
        return 0;
      const lmT = new Date(lm.createdAt || 0).getTime();
      if (Number.isNaN(lmT))
        return Math.max(0, Math.floor(Number(conversation.unreadCount || 0)));
      if (lastSeenMs != null && lmT <= lastSeenMs) return 0;
      const cu = clientUnreadByConv[convKey] ?? 0;
      return Math.max(cu, 1);
    },
    [clientUnreadByConv, currentUserId],
  );

  const loadThreadMessages = useCallback(
    async (chat, opts = {}) => {
      const quiet = opts.quiet === true;
      if (!chat) {
        setMessages([]);
        setThreadNextCursor(undefined);
        setThreadHasMore(false);
        return;
      }
      if (!quiet) setLoadingThread(true);
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
        if (refreshPendingSquadInvitationIdsRef.current) {
          await refreshPendingSquadInvitationIdsRef.current();
        }
        if (!isSyntheticConversationId(cid)) {
          const data = await apiRequest(
            API.FRIENDS.GET_CONVERSATION_MESSAGES(cid, {
              limit: THREAD_MSG_LIMIT,
            }),
          );
          const msgs = data?.messages || [];
          setMessages(msgs);
          setThreadNextCursor(data?.nextCursor);
          setThreadHasMore(Boolean(data?.hasMore));
          const cidStr = String(cid);
          if (msgs?.length) {
            const best = msgs.reduce((a, b) => {
              const ta = new Date(a.createdAt || 0).getTime();
              const tb = new Date(b.createdAt || 0).getTime();
              return tb >= ta ? b : a;
            });
            const maxMs = new Date(best.createdAt || 0).getTime();
            clientLastSeenAtByConvRef.current[cidStr] = Number.isNaN(maxMs)
              ? Date.now()
              : maxMs;
            writeStoredLastSeen(cidStr, {
              lastSeenAtMs: clientLastSeenAtByConvRef.current[cidStr],
              lastSeenMessageId: best?.id ?? null,
            });
          } else {
            const now = Date.now();
            clientLastSeenAtByConvRef.current[cidStr] = now;
            writeStoredLastSeen(cidStr, {
              lastSeenAtMs: now,
              lastSeenMessageId: null,
            });
          }
          setClientUnreadByConv((prev) => ({ ...prev, [cidStr]: 0 }));
          await markReadForPeer(chat.otherUser?.id || chat.otherUserId);
          return;
        }
        if (reqId && (chat.isFollowRequest || chat.isOutgoingFriendRequest)) {
          const list = await apiRequest(
            API.FRIENDS.GET_REQUEST_MESSAGES(reqId),
          );
          const arr = Array.isArray(list) ? list : [];
          setMessages(arr);
          if (!chat.isOutgoingFriendRequest)
            await markReadForPeer(chat.otherUser?.id || chat.otherUserId);
          return;
        }
        setMessages([]);
      } catch (e) {
        console.error("[Inbox] loadThreadMessages", e);
        setMessages([]);
        setThreadNextCursor(undefined);
        setThreadHasMore(false);
      } finally {
        if (!quiet) setLoadingThread(false);
      }
    },
    [markReadForPeer],
  );

  const refreshPendingSquadInvitationIds = useCallback(async () => {
    try {
      const pending = await apiRequest(API.SQUAD.RECEIVED_INVITATIONS);
      const ids = new Set(
        (pending?.invitations || []).map((inv) => String(inv?.id)).filter(Boolean),
      );
      setActivePendingSquadInvitationIds((prev) => {
        if (prev.size === ids.size) {
          let same = true;
          for (const id of ids) {
            if (!prev.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return ids;
      });
    } catch {
      setActivePendingSquadInvitationIds((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, []);

  useEffect(() => {
    refreshPendingSquadInvitationIdsRef.current = refreshPendingSquadInvitationIds;
  }, [refreshPendingSquadInvitationIds]);

  const handleSquadInviteResponse = useCallback(
    async (invitationId, action) => {
      if (!invitationId) return;
      setThreadProductMessage(null);
      try {
        if (action === "accept") {
          const res = await apiRequest(API.SQUAD.ACCEPT_INVITATION(invitationId), {
            method: "POST",
          });
          const attachState = String(res?.lateJoinAttach || "");
          if (attachState === "failed") {
            setThreadProductMessage({
              variant: "warning",
              text: "Invite accepted, but auto-join to active call failed. Open Squad and tap Meet someone now.",
            });
          } else if (attachState === "no_active_room") {
            setThreadProductMessage({
              variant: "warning",
              text: "Invite accepted. Squad is active, but no live room was found yet.",
            });
          }
          if (activeChat) await loadThreadMessages(activeChat, { quiet: true });
          await loadLists({ quiet: true });
          router.push("/?squad=1");
        } else {
          await apiRequest(API.SQUAD.REJECT_INVITATION(invitationId), {
            method: "POST",
          });
          if (activeChat) await loadThreadMessages(activeChat, { quiet: true });
          await loadLists({ quiet: true });
        }
      } catch (e) {
        const msg = e?.message || "Something went wrong";
        setThreadProductMessage({ variant: "error", text: msg });
        if (activeChat) void loadThreadMessages(activeChat, { quiet: true });
        await loadLists({ quiet: true });
      }
    },
    [activeChat, loadThreadMessages, loadLists, router],
  );

  const loadOlderThreadMessages = useCallback(async () => {
    if (
      !activeChat ||
      loadingThreadOlder ||
      !threadNextCursor ||
      !threadHasMore
    )
      return;
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
        }),
      );
      const older = data?.messages || [];
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [
          ...older.filter((m) => m.id && !seen.has(m.id)),
          ...prev,
        ];
        return merged;
      });
      setThreadNextCursor(data?.nextCursor);
      setThreadHasMore(Boolean(data?.hasMore));
    } catch (e) {
      console.error("[Inbox] loadOlderThreadMessages", e);
      pendingThreadScrollRestoreRef.current = null;
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
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || ""
        : "";
    if (!token) return;
    const base = API?.FRIENDS_WS?.WS_URL;
    if (!base) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === 0 || wsRef.current.readyState === 1)
    )
      return;
    const wsUrlWithAuth = `${base}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;
    if (wsHeartbeatRef.current) clearInterval(wsHeartbeatRef.current);
    wsHeartbeatRef.current = setInterval(() => {
      try {
        if (ws.readyState === 1)
          ws.send(JSON.stringify({ type: "ping", data: { at: Date.now() } }));
      } catch {}
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
        if (m.messageType === "SQUAD_INVITE" || m.messageType === "SQUAD_INVITE_OUTCOME") {
          refreshPendingSquadInvitationIdsRef.current?.();
        }
        const uid = currentUserIdRef.current;
        const isIncoming = String(m.toUserId) === String(uid);
        const activeNow = activeChatRef.current;
        const activeCidNow = activeNow?.conversationId || activeNow?.rowKey;
        const isActiveIncoming =
          isIncoming &&
          activeCidNow &&
          String(activeCidNow) === String(m.conversationId);
        const msgKey =
          m.id != null
            ? `id:${String(m.id)}`
            : `k:${m.fromUserId}:${m.toUserId}:${m.conversationId}:${m.createdAt}:${m.messageType}:${m.message || ""}:${m.giftId || ""}:${m.giftAmount || ""}:${m.gif?.url || ""}:${m.gif?.previewUrl || ""}:${m.squadMeta || ""}`;
        if (seenWsMessageKeysRef.current.has(msgKey)) return;
        seenWsMessageKeysRef.current.add(msgKey);
        const convKey = String(m.conversationId);
        const lastSeenAtMs =
          clientLastSeenAtByConvRef.current[convKey] ??
          readStoredLastSeen(convKey)?.lastSeenAtMs ??
          null;
        if (
          isIncoming &&
          !isActiveIncoming &&
          convKey &&
          !isSyntheticConversationId(convKey)
        ) {
          if (lastSeenAtMs != null) {
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
                `${x.fromUserId}:${x.toUserId}:${x.createdAt}:${x.messageType}:${x.message || ""}` ===
                key,
            );
            if (has) return prev;
          }
          const ac = activeChatRef.current;
          const activeCid = ac?.conversationId || ac?.rowKey;
          if (!activeCid || String(activeCid) !== String(m.conversationId))
            return prev;
          return [...prev, { ...m, isRead: m.toUserId === uid ? false : true }];
        });
        const rawUnread = m.unreadCountForConversation;
        const hasServerUnread =
          rawUnread !== undefined &&
          rawUnread !== null &&
          !Number.isNaN(Number(rawUnread));
        const nextUnread = hasServerUnread
          ? Math.max(0, Math.floor(Number(rawUnread)))
          : null;
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
                  gif: m.gif || null,
                  squadMeta: m.squadMeta ?? null,
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
          if (wsListSyncTimerRef.current)
            clearTimeout(wsListSyncTimerRef.current);
          wsListSyncTimerRef.current = setTimeout(() => {
            wsListSyncTimerRef.current = null;
            loadListsFn?.({ quiet: true });
          }, 350);
        }
        if (!inInbox && !inReq && !inSent) loadListsFn?.({ quiet: true });
        if (isIncoming) scheduleNotifFn?.({ force: true });
        const ac2 = activeChatRef.current;
        const activeCid2 = ac2?.conversationId || ac2?.rowKey;
        if (
          activeCid2 &&
          String(activeCid2) === String(m.conversationId) &&
          isIncoming
        ) {
          const clearForConv = (setter) =>
            setter((prev) =>
              prev.map((c) =>
                String(c.conversationId || c.id) === String(m.conversationId)
                  ? { ...c, unreadCount: 0 }
                  : c,
              ),
            );
          clearForConv(setInboxList);
          clearForConv(setRequestsList);
          clearForConv(setSentList);
          const peerId = ac2?.otherUserId || ac2?.otherUser?.id;
          if (peerId && markReadFn) {
            if (markReadWsDebounceRef.current) {
              clearTimeout(markReadWsDebounceRef.current);
            }
            markReadWsDebounceRef.current = setTimeout(() => {
              markReadWsDebounceRef.current = null;
              void markReadFn(peerId);
            }, 500);
          }
        }
      }

      if (msg.type === "friend:refresh") {
        loadListsRef.current?.({ quiet: true, skipNotificationBadge: true });
        loadNotificationBadgeRef.current?.({ force: true });
        refreshPendingSquadInvitationIdsRef.current?.();
      }

      if (msg.type === "friend:typing" && msg.data) {
        const t = msg.data;
        const ac = activeChatRef.current;
        const activeCid = ac?.conversationId || ac?.rowKey;
        if (!activeCid || String(activeCid) !== String(t.conversationId))
          return;
        if (
          String(t.fromUserId) !== String(ac?.otherUserId || ac?.otherUser?.id)
        )
          return;
        setPeerTyping(Boolean(t.isTyping));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setPeerTyping(false), 2500);
      }

      if (msg.type === "friend:read" && msg.data) {
        const other = msg.data?.fromUserId;
        if (!other) return;
        const clearForOther = (setter) =>
          setter((prev) =>
            prev.map((c) =>
              String(c.otherUserId) === String(other)
                ? { ...c, unreadCount: 0 }
                : c,
            ),
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
      const n = Math.min(8, wsReconnectAttemptRef.current + 1);
      wsReconnectAttemptRef.current = n;
      const delay = Math.min(15000, 500 * 2 ** n);
      if (wsReconnectTimerRef.current)
        clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = setTimeout(
        () => connectFriendsWsRef.current?.(),
        delay,
      );
    };
    ws.onerror = () => {};
  }, []);

  useEffect(() => {
    connectFriendsWsRef.current = connectFriendsWs;
  }, [connectFriendsWs]);

  useEffect(() => {
    void refreshPendingSquadInvitationIds();
  }, [refreshPendingSquadInvitationIds]);

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
      if (markReadWsDebounceRef.current) {
        clearTimeout(markReadWsDebounceRef.current);
        markReadWsDebounceRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [connectFriendsWs]);

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
          }),
        );
      } catch {}
    },
    [activeChat?.conversationId, activeChat?.otherUserId],
  );

  useEffect(() => {
    if (!activeChat) return;
    if (threadPollRef.current) {
      clearInterval(threadPollRef.current);
      threadPollRef.current = null;
    }
    const tick = async () => {
      try {
        await loadThreadMessages(activeChat, { quiet: true });
        await loadLists({ quiet: true, skipNotificationBadge: true });
      } catch {}
    };
    tick();
    threadPollRef.current = setInterval(tick, 15000);
    return () => {
      if (threadPollRef.current) {
        clearInterval(threadPollRef.current);
        threadPollRef.current = null;
      }
    };
  }, [activeChat?.rowKey]); // Reduced dependencies to avoid frequent interval resets

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (activeChat) void loadThreadMessages(activeChat).catch(() => {});
      void loadLists({ quiet: true, skipNotificationBadge: true }).catch(
        () => {},
      );
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
        prev && prev.rowKey === rk
          ? { ...prev, otherUser: { ...prev.otherUser, ...u } }
          : prev,
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
      await apiRequest(API.FRIENDS.ACCEPT_FRIEND_REQUEST(clean), {
        method: "POST",
        body: "{}",
      });
      setActiveChat(null);
      await loadLists();
    } catch (e) {
      console.error(e);
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Failed to accept",
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    const clean = cleanRequestId(requestId);
    if (!clean) return;
    try {
      await apiRequest(API.FRIENDS.REJECT_FRIEND_REQUEST(clean), {
        method: "POST",
        body: "{}",
      });
      setActiveChat(null);
      await loadLists();
    } catch (e) {
      console.error(e);
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Failed to reject",
      });
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
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Could not send friend request",
      });
    } finally {
      setSendFriendBusy(false);
    }
  };

  const sendMessage = async (giftData = null) => {
    if (!activeChat || sending) return;
    setThreadProductMessage(null);
    // Backward-compatible: `sendMessage(gift)` still works. We also accept `sendMessage(gif)`
    // where gif looks like { url, previewUrl, ... }.
    const candidate = giftData;
    const isGiftCandidate =
      candidate &&
      typeof candidate === "object" &&
      ("price" in candidate || "id" in candidate) &&
      (typeof candidate.price === "number" ||
        typeof candidate.price === "string");
    const isGifCandidate =
      candidate &&
      typeof candidate === "object" &&
      ("previewUrl" in candidate || "url" in candidate) &&
      (typeof candidate.previewUrl === "string" ||
        typeof candidate.url === "string");

    const resolvedGift = isGiftCandidate ? candidate : null;
    const resolvedGif = !resolvedGift && isGifCandidate ? candidate : null;

    const trimmed = newMessage.trim();
    const hasText = Boolean(trimmed);
    if (!hasText && !resolvedGift && !resolvedGif) return;
    const realCid = activeChat.conversationId;
    const textOnlyOk =
      activeChat.isFriend ||
      resolvedGift ||
      canSendTextOnlyNonFriend(messages, currentUserId);
    if (!textOnlyOk) {
      setThreadProductMessage({
        variant: "warning",
        text: "Further messages need a gift. Tap the gift button.",
      });
      return;
    }
    let body;
    try {
      body = buildSendMessagePayload({
        trimmed,
        hasText,
        resolvedGift,
        resolvedGif,
      });
    } catch (err) {
      setThreadProductMessage({
        variant: "error",
        text: err instanceof Error ? err.message : "Could not send",
      });
      return;
    }
    try {
      setSending(true);
      if (!isSyntheticConversationId(realCid)) {
        const res = await apiRequest(API.FRIENDS.SEND_MESSAGE(realCid), {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (res?.promotedToInbox) setActiveTab("inbox");
        if (typeof res?.newBalance === "number") setWalletCoins(res.newBalance);
        else refreshWallet();
      } else if (activeChat.outgoingFriendRequestId) {
        const res = await apiRequest(
          API.FRIENDS.SEND_REQUEST_MESSAGE(activeChat.outgoingFriendRequestId),
          { method: "POST", body: JSON.stringify(body) },
        );
        if (typeof res?.newBalance === "number") setWalletCoins(res.newBalance);
        else refreshWallet();
      } else {
        setThreadProductMessage({
          variant: "warning",
          text: "You can't send a message here yet. Accept the friend request, or open a conversation thread.",
        });
        return;
      }
      setNewMessage("");
      setIsGiftModalOpen(false);
      await loadThreadMessages(activeChat);
      await loadLists({ quiet: true });
    } catch (e) {
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Failed to send",
      });
    } finally {
      setSending(false);
    }
  };

  const currentList =
    activeTab === "inbox"
      ? inboxList
      : activeTab === "requests"
        ? requestsList
        : sentList;

  const filteredConversationList = useMemo(
    () =>
      currentList.filter((c) =>
        conversationMatchesSearch(c, conversationSearch),
      ),
    [currentList, conversationSearch],
  );

  useEffect(() => {
    const rk = activeChat?.rowKey;
    if (rk == null || rk === "") return;
    const list =
      activeTab === "inbox"
        ? inboxList
        : activeTab === "requests"
          ? requestsList
          : sentList;
    const row = list.find(
      (c) => String(c.conversationId || c.id) === String(rk),
    );
    if (!row) return;
    setActiveChat((prev) => {
      if (!prev || String(prev.rowKey) !== String(rk)) return prev;
      const nu = row.userStatus;
      const nb = row.isBroadcasting;
      const bu = row.broadcastUrl;
      if (
        prev.userStatus === nu &&
        prev.isBroadcasting === nb &&
        prev.broadcastUrl === bu
      )
        return prev;
      return { ...prev, userStatus: nu, isBroadcasting: nb, broadcastUrl: bu };
    });
  }, [inboxList, requestsList, sentList, activeTab, activeChat?.rowKey]);

  const requestsTabCount =
    (notif?.breakdown?.receivedRequests ?? 0) +
    (notif?.breakdown?.friendRequests ?? 0);
  const listHasMore =
    activeTab === "inbox"
      ? inboxHasMore
      : activeTab === "requests"
        ? requestsHasMore
        : sentHasMore;

  const openRow = (row) => {
    setThreadProductMessage(null);
    const cid = row.conversationId || row.id;
    const followId =
      row.followRequestId ||
      (typeof cid === "string" && cid.startsWith("follow_")
        ? cid.replace("follow_", "")
        : null) ||
      (typeof row.id === "string" && row.id.startsWith("pending_fr_")
        ? row.id.replace("pending_fr_", "")
        : null);
    const outgoingId =
      row.outgoingFriendRequestId ||
      (typeof row.id === "string" && row.id.startsWith("outgoing_fr_")
        ? row.id.replace("outgoing_fr_", "")
        : null);
    const clearUnread = (setter) =>
      setter((prev) =>
        prev.map((c) => {
          const k = String(c.conversationId || c.id);
          return String(k) === String(cid) ? { ...c, unreadCount: 0 } : c;
        }),
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
    if (!isSyntheticConversationId(cid))
      void markReadForPeer(row.otherUser?.id || row.otherUserId);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("chat");
    if (!cid || activeChat?.rowKey === cid) return;

    const row = [...inboxList, ...requestsList, ...sentList].find(
      (c) => String(c.conversationId || c.id) === String(cid),
    );
    if (row) {
      openRow(row);
      return;
    }

    const otherUserId = params.get("userId");
    if (!otherUserId) return;
    setActiveTab("inbox");
    setActiveChat({
      rowKey: cid,
      conversationId: cid,
      otherUser: {
        id: otherUserId,
        username: params.get("username") || "User",
        displayPictureUrl: params.get("photo") || null,
      },
      otherUserId,
      isFriend: params.get("friend") === "1",
      isFollowRequest: false,
      isOutgoingFriendRequest: false,
      followRequestId: null,
      outgoingFriendRequestId: null,
      unreadCount: 0,
    });
  }, [activeChat?.rowKey, inboxList, requestsList, sentList]);

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

  const otherProfile = activeChat?.otherUser;
  const peerId = activeChat?.otherUserId || otherProfile?.id || null;

  const handleUnfriendPeer = async () => {
    if (!peerId || !activeChat?.isFriend || threadActionBusy) return;
    const label = otherProfile?.username || "this user";
    if (
      !window.confirm(
        `Remove ${label} as a friend? You can send a new request later.`,
      )
    )
      return;
    setThreadActionBusy(true);
    try {
      await apiRequest(API.FRIENDS.UNFRIEND(peerId), {
        method: "POST",
        body: "{}",
      });
      setThreadMenuOpen(false);
      setActiveChat((prev) => (prev ? { ...prev, isFriend: false } : prev));
      await loadLists({ quiet: true, skipNotificationBadge: true });
      scheduleNotificationBadge();
    } catch (e) {
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Could not unfriend",
      });
    } finally {
      setThreadActionBusy(false);
    }
  };

  const handleBlockPeer = async () => {
    if (!peerId || threadActionBusy) return;
    const label = otherProfile?.username || "this user";
    if (
      !window.confirm(
        `Block ${label}? They won't be able to message you and pending requests with them will be closed.`,
      )
    )
      return;
    setThreadActionBusy(true);
    try {
      await apiRequest(API.FRIENDS.BLOCK_USER(peerId), {
        method: "POST",
        body: "{}",
      });
      setThreadMenuOpen(false);
      setActiveChat(null);
      await loadLists();
      scheduleNotificationBadge();
    } catch (e) {
      setThreadProductMessage({
        variant: "error",
        text: e.message || "Could not block user",
      });
    } finally {
      setThreadActionBusy(false);
    }
  };

  return (
    <div
      className={clsx(
        "fixed",
        "inset-0",
        "h-[100dvh]",
        "w-full",
        "text-white",
        "font-sans",
        "overflow-hidden",
      )}
    >
      <div
        className={clsx("absolute", "inset-0", "-z-50")}
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />
      <div
        className={clsx(
          "flex",
          "h-full",
          "min-h-0",
          "flex-col",
          "md:py-12",
          "md:px-0",
          "lg:px-24",
          "md:max-w-7xl",
          "md:mx-auto",
          "relative",
          "z-10",
          "font-[family-name:var(--font-otomanopee)]",
        )}
      >
        <InboxHeader
          activeChat={activeChat}
          walletCoins={walletCoins}
          firstMessageCost={firstMessageCost}
        />

        <div
          className={clsx(
            "flex",
            "min-h-0",
            "flex-1",
            "w-full",
            "flex-col",
            "rounded-[48px]",
            "md:ring-2",
            "md:ring-white/50",
            "md:ring-offset-2",
            "md:ring-offset-purple-900/90",
            "overflow-hidden",
            "bg-transparent",
            "md:h-[78vh]",
            "md:flex-row",
          )}
        >
          <ConversationSidebar
            activeChat={activeChat}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setActiveChat={setActiveChat}
            msgFilter={msgFilter}
            setMsgFilter={setMsgFilter}
            conversationSearch={conversationSearch}
            setConversationSearch={setConversationSearch}
            notif={notif}
            requestsTabCount={requestsTabCount}
            loading={loading}
            listLoadError={listLoadError}
            loadLists={loadLists}
            currentList={currentList}
            filteredConversationList={filteredConversationList}
            listHasMore={listHasMore}
            loadingMore={loadingMore}
            loadMore={loadMore}
            computeSidebarUnread={computeSidebarUnread}
            openRow={openRow}
          />
          <div
            className={`min-h-0 md:w-[60%] w-full h-full flex flex-col p-2 ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {activeChat ? (
              <>
                <div
                  className={clsx(
                    "md:border",
                    "md:border-white/50",
                    "md:rounded-[50px]",
                    "flex-1",
                    "flex",
                    "flex-col",
                    "overflow-hidden",
                  )}
                >
                  <ThreadHeader
                    activeChat={activeChat}
                    activeTab={activeTab}
                    otherProfile={otherProfile}
                    peerTyping={peerTyping}
                    threadMenuOpen={threadMenuOpen}
                    setThreadMenuOpen={setThreadMenuOpen}
                    threadMenuRef={threadMenuRef}
                    threadActionBusy={threadActionBusy}
                    sendFriendBusy={sendFriendBusy}
                    peerId={peerId}
                    setActiveChat={setActiveChat}
                    sendOfflineFriendRequest={sendOfflineFriendRequest}
                    handleUnfriendPeer={handleUnfriendPeer}
                    handleBlockPeer={handleBlockPeer}
                  />

                  {showRecipientFollowActions && (
                    <div
                      className={clsx(
                        "px-6",
                        "py-4",
                        "flex",
                        "gap-3",
                        "justify-center",
                        "border-b",
                        "border-white/10",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleAcceptRequest(
                            activeChat.followRequestId ||
                              (String(activeChat.conversationId).startsWith(
                                "follow_",
                              )
                                ? String(activeChat.conversationId).replace(
                                    "follow_",
                                    "",
                                  )
                                : String(activeChat.conversationId).replace(
                                    "pending_fr_",
                                    "",
                                  )),
                          )
                        }
                        className={clsx(
                          "bg-[#d91e82]",
                          "text-white",
                          "text-sm",
                          "font-bold",
                          "px-6",
                          "py-2",
                          "rounded-full",
                        )}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRejectRequest(
                            activeChat.followRequestId ||
                              (String(activeChat.conversationId).startsWith(
                                "follow_",
                              )
                                ? String(activeChat.conversationId).replace(
                                    "follow_",
                                    "",
                                  )
                                : String(activeChat.conversationId).replace(
                                    "pending_fr_",
                                    "",
                                  )),
                          )
                        }
                        className={clsx(
                          "bg-white/10",
                          "text-white",
                          "text-sm",
                          "font-bold",
                          "px-6",
                          "py-2",
                          "rounded-full",
                        )}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {textInputLocked && showComposer && (
                    <p
                      className={clsx(
                        "px-6",
                        "pt-2",
                        "text-[11px]",
                        "text-amber-200/90",
                        "font-medium",
                      )}
                    >
                      You&apos;ve sent a message here already — next sends need a
                      gift (tap gift icon).
                    </p>
                  )}
                  {!activeChat.isFriend &&
                    showComposer &&
                    canSendTextOnlyNonFriend(messages, currentUserId) &&
                    walletCoins != null &&
                    walletCoins < firstMessageCost && (
                      <p
                        className={clsx(
                          "px-6",
                          "pt-1",
                          "text-[11px]",
                          "text-red-300/90",
                        )}
                      >
                        Low balance: first text costs ~{firstMessageCost} coins.
                      </p>
                    )}

                  {threadProductMessage && (
                    <div
                      role="alert"
                      className={clsx(
                        "mx-4",
                        "mb-2",
                        "mt-1",
                        "flex",
                        "items-start",
                        "gap-3",
                        "rounded-2xl",
                        "border",
                        "px-4",
                        "py-3",
                        "text-[13px]",
                        "leading-snug",
                        threadProductMessage.variant === "warning"
                          ? clsx(
                              "border-amber-400/45",
                              "bg-amber-950/35",
                              "text-amber-50",
                            )
                          : clsx(
                              "border-red-400/45",
                              "bg-red-950/40",
                              "text-red-50",
                            ),
                      )}
                    >
                      <p className="min-w-0 flex-1 font-medium">
                        {threadProductMessage.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => setThreadProductMessage(null)}
                        className={clsx(
                          "shrink-0",
                          "rounded-full",
                          "border",
                          "border-white/25",
                          "px-3",
                          "py-1",
                          "text-[11px]",
                          "font-bold",
                          "uppercase",
                          "tracking-wide",
                          "hover:bg-white/10",
                        )}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <ThreadMessages
                    messages={messages}
                    currentUserId={currentUserId}
                    myAvatarUrl={myAvatarUrl}
                    messagesScrollRef={messagesScrollRef}
                    threadHasMore={threadHasMore}
                    activeChat={activeChat}
                    loadingThreadOlder={loadingThreadOlder}
                    loading={loadingThread}
                    loadOlderThreadMessages={loadOlderThreadMessages}
                    onSquadInviteResponse={handleSquadInviteResponse}
                    activePendingSquadInvitationIds={activePendingSquadInvitationIds}
                  />
                </div>

                {showComposer && (
                  <ThreadComposer
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    sending={sending}
                    textInputLocked={textInputLocked}
                    walletCoins={walletCoins}
                    firstMessageCost={firstMessageCost}
                    isGiftModalOpen={isGiftModalOpen}
                    setIsGiftModalOpen={setIsGiftModalOpen}
                    giftModalItems={giftModalItems}
                    giftsCatalogLoading={giftsCatalogLoading}
                    sendMessage={sendMessage}
                    emitTyping={emitTyping}
                    typingTimerRef={typingTimerRef}
                  />
                )}
              </>
            ) : (
              <div
                className={clsx(
                  "flex",
                  "min-h-0",
                  "flex-1",
                  "flex-col",
                  "overflow-hidden",
                  "rounded-3xl",
                  "border",
                  "border-white/50",
                  "md:rounded-[50px]",
                )}
              >
                <div
                  className={clsx(
                    "flex",
                    "flex-1",
                    "items-center",
                    "justify-center",
                    "px-4",
                    "py-12",
                  )}
                >
                  <p className={clsx("text-center", "text-white/60")}>
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
