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

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
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
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [threadActionBusy, setThreadActionBusy] = useState(false);

  const messagesScrollRef = useRef(null);
  const threadMenuRef = useRef(null);
  const threadPollRef = useRef(null);
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

  const loadNotificationBadge = useCallback(async () => {
    try {
      const data = await apiRequest(API.FRIENDS.GET_NOTIFICATIONS_COUNT);
      setNotif(data);
    } catch {
      setNotif(null);
    }
  }, []);

  const loadLists = useCallback(
    async (opts = {}) => {
      const quiet = opts.quiet === true;
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

        await loadNotificationBadge();
      } catch (e) {
        console.error("[Inbox] loadLists", e);
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
    [activeTab, msgFilter, router, resolveUserIdFromToken, loadNotificationBadge, enrichUser]
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
        await loadNotificationBadge();
      } catch {
        /* optional endpoint — lists may already mark seen */
      }
    };
    run();
  }, [activeTab, loadNotificationBadge]);

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
          await loadLists({ quiet: true });
        }
      } catch (e) {
        console.warn("[Inbox] markRead", e);
      }
    },
    [loadLists]
  );

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
          setMessages(data?.messages || []);
          setThreadNextCursor(data?.nextCursor);
          setThreadHasMore(Boolean(data?.hasMore));
          await markReadForPeer(chat.otherUser?.id || chat.otherUserId);
          return;
        }
        if (reqId && (chat.isFollowRequest || chat.isOutgoingFriendRequest)) {
          const list = await apiRequest(API.FRIENDS.GET_REQUEST_MESSAGES(reqId));
          setMessages(Array.isArray(list) ? list : []);
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
        await loadLists({ quiet: true });
      } catch {
        // ignore polling errors; UI should remain usable
      }
    };

    // Kick once immediately, then poll.
    tick();
    threadPollRef.current = setInterval(tick, 2500);

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
      if (activeChat) loadThreadMessages(activeChat);
      loadLists({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [activeChat, loadThreadMessages, loadLists]);

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
      conversationId: row.conversationId,
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
      await loadLists({ quiet: true });
      await loadNotificationBadge();
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
      await loadNotificationBadge();
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

      <div className="h-full flex flex-col md:py-12 md:px-12 lg:px-24 md:max-w-6xl md:mx-auto relative z-10 font-[family-name:var(--font-otomanopee)]">
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

        <div className="flex-1 w-full md:h-[78vh] rounded-[48px] ring-2 ring-white/50 ring-offset-2 ring-offset-purple-900/90 overflow-hidden flex flex-col md:flex-row bg-transparent">
          <div
            className={` md:w-[40%] w-full  md:p-6 p-4
            ${activeChat ? "hidden md:flex" : "flex"} flex-col`}
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

            <div className="border border-white/50 rounded-3xl p-6 flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/60">Loading conversations...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-4 md:px-0">
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
                      const unread = Number(conversation.unreadCount || 0) > 0;
                      const selected = activeChat?.rowKey === (conversation.conversationId || conversation.id);
                      const st = conversation.userStatus;
                      const live = Boolean(
                        conversation.broadcastUrl &&
                          (conversation.isBroadcasting || st === "broadcasting")
                      );
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => openRow(conversation)}
                          className={`flex items-center gap-4 border-b border-white/20 pb-4 text-left px-2 rounded-xl transition-colors ${
                            unread ? "bg-purple-500/25 ring-1 ring-yellow-400/50" : "hover:bg-white/5"
                          } ${selected ? "bg-white/10" : ""}`}
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                            <Image
                              src={conversation.otherUser?.displayPictureUrl || "/assets/ico.png"}
                              alt={conversation.otherUser?.username || "User"}
                              fill
                              className="object-cover "
                            />
                            {st === "online" && (
                              <span
                                className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-black/80"
                                title="Online"
                              />
                            )}
                            {live && (
                              <button
                                type="button"
                                title="Watch live"
                                onClick={(e) => openBroadcast(e, conversation.broadcastUrl)}
                                className="absolute -top-1 -right-1 rounded bg-pink-600 px-1 text-[8px] font-black uppercase leading-none shadow"
                              >
                                LIVE
                              </button>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base flex items-center gap-2 justify-between">
                              <span className="truncate">{conversation.otherUser?.username || "User"}</span>
                              {unread && (
                                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center">
                                  {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-white/50 truncate font-light mt-0.5">
                              {lastMessagePreview(conversation)}
                            </div>
                          </div>
                        </button>
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
            className={`md:w-[60%] w-full h-full flex flex-col p-2
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {activeChat ? (
              <>
                <div className="border border-white/50 rounded-[50px]  flex-1 flex flex-col overflow-hidden ">
                  <div className="flex items-center justify-between md:px-6  md:p-2 md:mt-6  bg-black/20 md:bg-transparent ">
                    <div className="flex items-center gap-3 bg-purple-600/20 border border-white p-1.5 pr-6 rounded-full min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setActiveChat(null)}
                        className="md:hidden text-2xl pl-2 flex-shrink-0"
                      >
                        <IoChevronBack />
                      </button>

                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white relative">
                          <Image
                            src={otherProfile?.displayPictureUrl || "/assets/ico.png"}
                            alt="User"
                            fill
                            className="object-cover rounded-full"
                          />
                        </div>
                        {headerUserStatus === "online" && (
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-black/80"
                            title="Online"
                          />
                        )}
                        {headerLive && (
                          <button
                            type="button"
                            title="Watch live"
                            onClick={(e) => openBroadcast(e, activeChat.broadcastUrl)}
                            className="absolute -top-1 -right-1 rounded bg-pink-600 px-1 text-[8px] font-black uppercase leading-none shadow z-10"
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
                                    src={localStorage.getItem("displayPictureUrl") || "/assets/avatar1.png"}
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
                        onChange={(e) => setNewMessage(e.target.value)}
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
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/60">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
