// API Configuration - Direct connection to individual microservices
// Each service runs on its own port


// const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
// const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3002';
// const FILES_SERVICE_URL = process.env.NEXT_PUBLIC_FILES_SERVICE_URL || 'http://localhost:3008';
// const FRIEND_SERVICE_URL = process.env.NEXT_PUBLIC_FRIEND_SERVICE_URL || 'http://localhost:3009';
// const DISCOVERY_SERVICE_URL = process.env.NEXT_PUBLIC_DISCOVERY_SERVICE_URL || 'http://localhost:3004';
// const WALLET_SERVICE_URL = process.env.NEXT_PUBLIC_WALLET_SERVICE_URL || 'http://localhost:3006';
// const STREAMING_SERVICE_URL = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3005';

// // API Endpoints - Direct to individual services
// export const API = {
//     // Auth endpoints (port 3001)
//     AUTH: {
//         GOOGLE: `${AUTH_SERVICE_URL}/auth/google`,
//         FACEBOOK: `${AUTH_SERVICE_URL}/auth/facebook`,
//         PHONE_SEND_OTP: `${AUTH_SERVICE_URL}/auth/phone/send-otp`,
//         PHONE_VERIFY: `${AUTH_SERVICE_URL}/auth/phone/verify`,
//     },

//     // User endpoints (port 3002)
//     USERS: {
//         GET_USER: (userId) => `${USER_SERVICE_URL}/users/${userId}`,
//         CREATE_PROFILE: (userId) => `${USER_SERVICE_URL}/users/${userId}/profile`,
//         UPDATE_PROFILE: `${USER_SERVICE_URL}/me/profile`,
//         UPDATE_STATUS: `${USER_SERVICE_URL}/me/status`,
//         UPDATE_STATUS_TEST: (userId) => `${USER_SERVICE_URL}/users/test/${userId}/status`,
//         ADD_PHOTO: `${USER_SERVICE_URL}/me/photos`,
//         UPDATE_INTENT: `${USER_SERVICE_URL}/me/intent`,
//         UPDATE_INTERESTS: `${USER_SERVICE_URL}/me/interests`,
//         UPDATE_VALUES: `${USER_SERVICE_URL}/me/values`,
//         UPDATE_BRANDS: `${USER_SERVICE_URL}/me/brand-preferences`,
//         SEARCH_MUSIC: (q, limit = 10) => `${USER_SERVICE_URL}/music/search?q=${encodeURIComponent(q)}&limit=${limit}`,
//         CREATE_MUSIC_PREFERENCE: `${USER_SERVICE_URL}/music/preferences`,
//         UPDATE_MUSIC_PREFERENCE: `${USER_SERVICE_URL}/me/music-preference`,
//         GET_INTENT_PROMPTS: (limit = 10) => `${USER_SERVICE_URL}/intent-prompts?limit=${limit}`,
//     },

//     // Files endpoints (port 3008)
//     FILES: {
//         UPLOAD: `${FILES_SERVICE_URL}/files/upload`,
//     },

//     // Friends endpoints (port 3009)
//     FRIENDS: {
//         GET_INBOX_CONVERSATIONS: `${FRIEND_SERVICE_URL}/me/conversations/inbox`,
//         GET_RECEIVED_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/received-requests`,
//         GET_SENT_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/sent-requests`,
//         GET_FRIENDS_WALL: `${FRIEND_SERVICE_URL}/me/friends/wall`,
//         GET_CONVERSATION_MESSAGES: (conversationId) => `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages`,
//         SEND_MESSAGE: (conversationId) => `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages`,
//         SEND_FRIEND_REQUEST: `${FRIEND_SERVICE_URL}/me/friends/offline-cards/request`,
//         GET_PENDING_REQUESTS: `${FRIEND_SERVICE_URL}/me/friends/requests/pending`,
//         ACCEPT_FRIEND_REQUEST: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/accept`,
//         REJECT_FRIEND_REQUEST: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/reject`,
//         CHECK_FRIENDSHIP: (friendId) => `${FRIEND_SERVICE_URL}/me/friends/${friendId}/check`,
//     },

//     // Discovery endpoints (port 3004 - discovery-service)
//     DISCOVERY: {
//         GET_METRICS: (userId) => `${DISCOVERY_SERVICE_URL}/metrics?userId=${userId}`,
//         GET_CARD: (userId, sessionId, soloOnly) => `${DISCOVERY_SERVICE_URL}/discovery/test/card?userId=${userId}&sessionId=${sessionId}&soloOnly=${soloOnly || false}`,
//         PROCEED: `${DISCOVERY_SERVICE_URL}/discovery/test/proceed`,
//         RAINCHECK: `${DISCOVERY_SERVICE_URL}/discovery/test/raincheck`,
//         SELECT_LOCATION: `${DISCOVERY_SERVICE_URL}/discovery/test/select-location`,
//         MY_ROOM: (userId) => `${DISCOVERY_SERVICE_URL}/discovery/test/my-room?userId=${userId}`,
//         GENDER_FILTERS: (userId) => `${DISCOVERY_SERVICE_URL}/gender-filters/test?userId=${userId}`,
//         APPLY_GENDER_FILTER: `${DISCOVERY_SERVICE_URL}/gender-filters/test/apply`,
//         LOCATION_PREFERENCE: (userId) => `${DISCOVERY_SERVICE_URL}/location/test/preference?userId=${userId}`,
//         UPDATE_LOCATION_PREFERENCE: `${DISCOVERY_SERVICE_URL}/location/test/preference`,
//         SEARCH_CITIES: (q) => `${DISCOVERY_SERVICE_URL}/location/search?q=${q}`,
//         GET_CITIES: `${DISCOVERY_SERVICE_URL}/location/cities`,
//         GET_INTERESTS: `${USER_SERVICE_URL}/interests`,
//         GET_VALUES: `${USER_SERVICE_URL}/values`,
//         GET_BRANDS: `${USER_SERVICE_URL}/brands`,
//         SEARCH_INTERESTS: (q) => `${USER_SERVICE_URL}/interests/search?q=${encodeURIComponent(q)}`,
//         SEARCH_VALUES: (q) => `${USER_SERVICE_URL}/values/search?q=${encodeURIComponent(q)}`,
//         SEARCH_BRANDS: (q) => `${USER_SERVICE_URL}/brands/search?q=${encodeURIComponent(q)}`,
//     },

//     // Streaming endpoints (port 3005 - streaming-service)
//     STREAMING: {
//         // Get the active room a user is currently in (no auth required)
//         GET_USER_ROOM: (userId) => `${STREAMING_SERVICE_URL}/streaming/test/users/${userId}/room`,
//         LEAVE_ROOM: (roomId) => `${STREAMING_SERVICE_URL}/streaming/test/rooms/${roomId}/leave`,
//         CREATE_ROOM: `${STREAMING_SERVICE_URL}/streaming/rooms`,
//         GET_HISTORY: (userId, limit = 20) => `${STREAMING_SERVICE_URL}/streaming/test/history/${userId}?limit=${limit}`,
//         GET_HISTORY_DETAIL: (sessionId) => `${STREAMING_SERVICE_URL}/streaming/history/${sessionId}`,
//         HIDE_HISTORY: (sessionId) => `${STREAMING_SERVICE_URL}/streaming/history/${sessionId}`,
//     },

//     // Wallet endpoints (port 3006 - wallet-service)
//     WALLET: {
//         GET_BALANCE: `${WALLET_SERVICE_URL}/me/balance`,
//     },
// };

// // Helper function to get auth headers
// export const getAuthHeaders = () => {
//     const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
//     return {
//         'Content-Type': 'application/json',
//         ...(token && { 'Authorization': `Bearer ${token}` })
//     };
// };

// // Helper function to make authenticated requests
// export const apiRequest = async (url, options = {}) => {
//     const headers = {
//         ...getAuthHeaders(),
//         ...options.headers
//     };

//     const response = await fetch(url, {
//         ...options,
//         headers
//     });

//     if (!response.ok) {
//         const error = await response.json().catch(() => ({ message: 'Request failed' }));
//         throw new Error(error.message || `HTTP ${response.status}`);
//     }

//     return response.json();
// };






// API Configuration - All requests go through the centralized API Gateway
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.beam.place';
const STREAMING_WS_BASE = process.env.NEXT_PUBLIC_STREAMING_WS_URL || 'wss://api.beam.place/streaming/ws';
const FRIENDS_WS_BASE = process.env.NEXT_PUBLIC_FRIENDS_WS_URL || 'wss://api.beam.place/v1/friends/ws';
const API_V1 = `${API_BASE}/v1`;

/* 
  Old Local Microservice URLs (Reference):
  - AUTH: http://localhost:3001
  - USER: http://localhost:3002
  - DISCOVERY: http://localhost:3004
  - STREAMING: http://localhost:3005
  - WALLET: http://localhost:3006
  - FILES: http://localhost:3008
  - FRIEND: http://localhost:3009
*/

// All services are accessible via the same gateway base.
// Gateway handles routing based on path prefixes.
const AUTH_SERVICE_URL = API_V1;         // Matches /auth
const USER_SERVICE_URL = API_V1;         // Matches /users, /me, /music, etc.
const FILES_SERVICE_URL = API_V1;        // Matches /files
const FRIEND_SERVICE_URL = `${API_V1}/friends`;   // Matches /friends (Gateway strips /friends prefix)
const DISCOVERY_SERVICE_URL = API_V1;    // Matches /discovery, /location, /gender-filters
const WALLET_SERVICE_URL = `${API_V1}/wallet`;     // Matches /wallet (Gateway strips /wallet prefix)
const STREAMING_SERVICE_URL = API_V1;    // Matches /streaming

// API Endpoints
export const API = {
    // Auth endpoints
    AUTH: {
        GOOGLE: `${AUTH_SERVICE_URL}/auth/google`,
        FACEBOOK: `${AUTH_SERVICE_URL}/auth/facebook`,
        PHONE_SEND_OTP: `${AUTH_SERVICE_URL}/auth/phone/send-otp`,
        PHONE_VERIFY: `${AUTH_SERVICE_URL}/auth/phone/verify`,
    },

    // User endpoints
    USERS: {
        GET_USER: (userId) => `${USER_SERVICE_URL}/users/${userId}`,
        GET_ME: `${USER_SERVICE_URL}/me`,
        CREATE_PROFILE: (userId) => `${USER_SERVICE_URL}/users/${userId}/profile`,
        UPDATE_PROFILE: `${USER_SERVICE_URL}/me/profile`,
        UPDATE_ZODIAC: `${USER_SERVICE_URL}/me/zodiac`,
        UPDATE_STATUS: `${USER_SERVICE_URL}/me/status`,
        // Alias kept for backward compat — routes to the real authenticated PATCH /me/status
        UPDATE_STATUS_TEST: () => `${USER_SERVICE_URL}/me/status`,
        ADD_PHOTO: `${USER_SERVICE_URL}/me/photos`,
        UPDATE_INTENT: `${USER_SERVICE_URL}/me/intent`,
        UPDATE_INTERESTS: `${USER_SERVICE_URL}/me/interests`,
        UPDATE_VALUES: `${USER_SERVICE_URL}/me/values`,
        UPDATE_BRANDS: `${USER_SERVICE_URL}/me/brand-preferences`,
        SEARCH_MUSIC: (q, limit = 10) => `${USER_SERVICE_URL}/music/search?q=${encodeURIComponent(q)}&limit=${limit}`,
        CREATE_MUSIC_PREFERENCE: `${USER_SERVICE_URL}/music/preferences`,
        UPDATE_MUSIC_PREFERENCE: `${USER_SERVICE_URL}/me/music-preference`,
        GET_INTENT_PROMPTS: (limit = 10) => `${USER_SERVICE_URL}/intent-prompts?limit=${limit}`,
        GET_ZODIACS: `${USER_SERVICE_URL}/admin/zodiacs`,
        UPDATE_PREFERRED_CITY: `${USER_SERVICE_URL}/me/preferred-city`,
    },

    // Files endpoints
    FILES: {
        UPLOAD: `${FILES_SERVICE_URL}/files/upload`,
    },

    // Friends endpoints (gateway: /v1/friends → friend-service /me/...)
    FRIENDS: {
        /** @param {{ limit?: number, cursor?: string, filter?: 'text_only'|'with_gift'|'only_follows' }} [q] */
        getInboxConversationsUrl: (q = {}) => {
            const p = new URLSearchParams();
            if (q.limit != null) p.set('limit', String(q.limit));
            if (q.cursor) p.set('cursor', q.cursor);
            if (q.filter) p.set('filter', q.filter);
            const s = p.toString();
            return `${FRIEND_SERVICE_URL}/me/conversations/inbox${s ? `?${s}` : ''}`;
        },
        getReceivedRequestsUrl: (q = {}) => {
            const p = new URLSearchParams();
            if (q.limit != null) p.set('limit', String(q.limit));
            if (q.cursor) p.set('cursor', q.cursor);
            if (q.filter) p.set('filter', q.filter);
            const s = p.toString();
            return `${FRIEND_SERVICE_URL}/me/conversations/received-requests${s ? `?${s}` : ''}`;
        },
        getSentRequestsUrl: (q = {}) => {
            const p = new URLSearchParams();
            if (q.limit != null) p.set('limit', String(q.limit));
            if (q.cursor) p.set('cursor', q.cursor);
            if (q.filter) p.set('filter', q.filter);
            const s = p.toString();
            return `${FRIEND_SERVICE_URL}/me/conversations/sent-requests${s ? `?${s}` : ''}`;
        },
        /** @deprecated use getInboxConversationsUrl */
        GET_INBOX_CONVERSATIONS: `${FRIEND_SERVICE_URL}/me/conversations/inbox`,
        GET_RECEIVED_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/received-requests`,
        GET_SENT_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/sent-requests`,
        GET_FRIENDS_WALL: `${FRIEND_SERVICE_URL}/me/friends/wall`,
        GET_CONVERSATION_MESSAGES: (conversationId, q = {}) => {
            const p = new URLSearchParams();
            if (q.limit != null) p.set('limit', String(q.limit));
            if (q.cursor) p.set('cursor', q.cursor);
            const s = p.toString();
            return `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages${s ? `?${s}` : ''}`;
        },
        SEND_MESSAGE: (conversationId) => `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages`,
        SEND_REQUEST_MESSAGE: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/messages`,
        GET_REQUEST_MESSAGES: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/messages`,
        SEND_FRIEND_MESSAGE: (friendId) => `${FRIEND_SERVICE_URL}/me/friends/${friendId}/messages`,
        MARK_MESSAGES_READ: (otherUserId) => `${FRIEND_SERVICE_URL}/me/friends/${otherUserId}/messages/read`,
        SEND_FRIEND_REQUEST: `${FRIEND_SERVICE_URL}/me/friends/offline-cards/request`,
        GET_PENDING_REQUESTS: `${FRIEND_SERVICE_URL}/me/friends/requests/pending`,
        GET_SENT_FRIEND_REQUESTS: `${FRIEND_SERVICE_URL}/me/friends/requests/sent`,
        GET_NOTIFICATIONS_COUNT: `${FRIEND_SERVICE_URL}/me/notifications/count`,
        /** Body: { section: "INBOX" | "RECEIVED_REQUESTS" | "SENT_REQUESTS" | "FRIEND_REQUESTS" } */
        MARK_NOTIFICATIONS_SEEN: `${FRIEND_SERVICE_URL}/me/notifications/mark-seen`,
        /** @returns {{ firstMessageCostCoins: number, gifts: Array<{ giftId: string, name: string, emoji: string, diamonds: number, coins: number }> }} */
        GET_GIFT_CATALOG: `${FRIEND_SERVICE_URL}/me/gifts/catalog`,
        // GIFs (Giphy proxy via backend)
        // Backend contract: messageType=GIF/GIF_WITH_MESSAGE and message.gif={ previewUrl, url }
        GIFS_TRENDING: `${FRIEND_SERVICE_URL}/me/gifs/trending`,
        GIFS_SEARCH: (q) => `${FRIEND_SERVICE_URL}/me/gifs/search?q=${encodeURIComponent(q || "")}`,
        UNFRIEND: (friendId) => `${FRIEND_SERVICE_URL}/me/friends/${friendId}/unfriend`,
        BLOCK_USER: (userId) => `${FRIEND_SERVICE_URL}/me/friends/${userId}/block`,
        ACCEPT_FRIEND_REQUEST: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/accept`,
        REJECT_FRIEND_REQUEST: (requestId) => `${FRIEND_SERVICE_URL}/me/friends/requests/${requestId}/reject`,
        CHECK_FRIENDSHIP: (friendId) => `${FRIEND_SERVICE_URL}/me/friends/${friendId}/check`,
    },

    // Discovery endpoints
    DISCOVERY: {
        // GET /discovery/card uses JWT from Authorization header — no userId param
        GET_CARD: (sessionId, soloOnly) => `${DISCOVERY_SERVICE_URL}/discovery/card?sessionId=${sessionId}&soloOnly=${soloOnly || false}`,
        PROCEED: `${DISCOVERY_SERVICE_URL}/discovery/proceed`,
        RAINCHECK: `${DISCOVERY_SERVICE_URL}/discovery/raincheck`,
        SELECT_LOCATION: `${DISCOVERY_SERVICE_URL}/discovery/select-location`,
        RESET_SESSION: `${DISCOVERY_SERVICE_URL}/discovery/reset-session`,
        // Offline cards
        GET_OFFLINE_CARD: `${DISCOVERY_SERVICE_URL}/discovery/offline-cards/card`,
        RAINCHECK_OFFLINE: `${DISCOVERY_SERVICE_URL}/discovery/offline-cards/raincheck`,
        GENDER_FILTERS: `${DISCOVERY_SERVICE_URL}/gender-filters`,
        APPLY_GENDER_FILTER: `${DISCOVERY_SERVICE_URL}/gender-filters/apply`,
        LOCATION_PREFERENCE: `${DISCOVERY_SERVICE_URL}/location/preference`,
        UPDATE_LOCATION_PREFERENCE: `${DISCOVERY_SERVICE_URL}/location/preference`,
        LOCATE_ME: `${DISCOVERY_SERVICE_URL}/location/locate-me`,
        SEARCH_CITIES: (q) => `${DISCOVERY_SERVICE_URL}/location/search?q=${encodeURIComponent(q)}`,
        GET_CITIES: `${DISCOVERY_SERVICE_URL}/location/cities`,
        GET_INTERESTS: `${USER_SERVICE_URL}/interests`,
        GET_VALUES: `${USER_SERVICE_URL}/values`,
        GET_BRANDS: `${USER_SERVICE_URL}/brands`,
        SEARCH_INTERESTS: (q) => `${USER_SERVICE_URL}/interests?q=${encodeURIComponent(q)}`,
        SEARCH_VALUES: (q) => `${USER_SERVICE_URL}/values?q=${encodeURIComponent(q)}`,
        SEARCH_BRANDS: (q) => `${USER_SERVICE_URL}/brands/search?q=${encodeURIComponent(q)}`,
        GET_ACTIVE_CITY_OPTIONS: `${USER_SERVICE_URL}/discovery-city-options/active`,

        // Beam TV / HMM_TV (TikTok-style broadcast feed)
        // GET /v1/discovery/broadcasts/feed?sessionId=xxx&deviceId=xxx
        GET_BROADCAST_FEED: (sessionId, deviceId) => {
            const p = new URLSearchParams();
            if (sessionId) p.set('sessionId', String(sessionId));
            if (deviceId) p.set('deviceId', String(deviceId));
            return `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/feed?${p.toString()}`;
        },
        // POST /v1/discovery/broadcasts/viewed { sessionId, roomId, deviceId?, duration? }
        MARK_BROADCAST_VIEWED: `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/viewed`,

        // Broadcast engagement
        // GET /v1/discovery/broadcasts/:roomId
        GET_BROADCAST: (roomId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}`,
        // Comments (optional; used by other Beam TV UI pieces)
        GET_BROADCAST_COMMENTS: (roomId, q = {}) => {
            const p = new URLSearchParams();
            if (q.limit != null) p.set('limit', String(q.limit));
            if (q.offset != null) p.set('offset', String(q.offset));
            const s = p.toString();
            return `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/comments${s ? `?${s}` : ''}`;
        },
        COMMENT_BROADCAST: (roomId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/comment`,
        SHARE_BROADCAST: (roomId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/share`,
        SEND_BROADCAST_GIFT: (roomId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/gift`,
        FOLLOW_BROADCAST_PARTICIPANT: (roomId, userId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/follow/${userId}`,
        UNFOLLOW_BROADCAST_PARTICIPANT: (roomId, userId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/unfollow/${userId}`,
        FOLLOW_STATUS: (roomId, userId) => `${DISCOVERY_SERVICE_URL}/discovery/broadcasts/${roomId}/follow/${userId}/status`,
    },

    // Streaming endpoints
    STREAMING: {
        // Get the room a specific user is currently in
        GET_USER_ROOM: (userId) => `${STREAMING_SERVICE_URL}/streaming/users/${userId}/room`,
        GET_ROOM: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}`,
        CREATE_ROOM: `${STREAMING_SERVICE_URL}/streaming/rooms`,
        // Room lifecycle is primarily managed via WebSocket 'leave-room' message.
        // HTTP leave endpoint is used as keepalive/cleanup fallback.
        END_ROOM: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/leave`,
        LEAVE_ROOM: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/leave`,
        // History — authenticated gateway paths
        GET_HISTORY: (limit = 20) => `${STREAMING_SERVICE_URL}/streaming/history?limit=${limit}`,
        GET_HISTORY_PAGINATED: (limit = 20, cursor) => `${STREAMING_SERVICE_URL}/streaming/history?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
        GET_HISTORY_DETAIL: (sessionId) => `${STREAMING_SERVICE_URL}/streaming/history/${sessionId}`,
        GET_HISTORY_TIMELINE: (sessionId) => `${STREAMING_SERVICE_URL}/streaming/history/${sessionId}/timeline`,
        HIDE_HISTORY: (sessionId) => `${STREAMING_SERVICE_URL}/streaming/history/${sessionId}`,
        ENABLE_PULL_STRANGER: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/enable-pull-stranger`,
        JOIN_VIA_PULL_STRANGER: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/join-via-pull-stranger`,
        GET_PULL_STRANGER_ROOM: (userId) => `${STREAMING_SERVICE_URL}/streaming/pull-stranger/room/${userId}`,

        // Broadcast join/waitlist
        REQUEST_TO_JOIN_BROADCAST: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/request-to-join`,
        CANCEL_JOIN_REQUEST: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/cancel-join-request`,
        GET_WAITLIST: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/waitlist`,
        ACCEPT_FROM_WAITLIST: (roomId) => `${STREAMING_SERVICE_URL}/streaming/rooms/${roomId}/accept-from-waitlist`,

        // Favourite broadcasters
        ADD_FAVOURITE_BROADCASTER: `${STREAMING_SERVICE_URL}/streaming/favourites`,
        REMOVE_FAVOURITE_BROADCASTER: (targetUserId) => `${STREAMING_SERVICE_URL}/streaming/favourites/${targetUserId}`,
        GET_FAVOURITE_BROADCASTERS: (limit = 20) => `${STREAMING_SERVICE_URL}/streaming/favourites/broadcasting?limit=${limit}`,

        // WebSocket URL (direct to streaming service, NOT via API gateway)
        WS_URL: STREAMING_WS_BASE,
    },

    // Friend-service messaging WebSocket URL (via API gateway)
    FRIENDS_WS: {
        WS_URL: FRIENDS_WS_BASE,
    },

    // Wallet endpoints
    WALLET: {
        GET_BALANCE: `${WALLET_SERVICE_URL}/me/balance`,
    },
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Helper function to make authenticated requests
export const apiRequest = async (url, options = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let parsed = null;
        try {
            parsed = raw ? JSON.parse(raw) : null;
        } catch {
            parsed = null;
        }
        const base =
            (parsed && (parsed.message || parsed.error || parsed.detail)) ||
            (raw && raw.trim()) ||
            `HTTP ${response.status}`;
        const e = new Error(
            response.status === 429
                ? `${base} — please wait a moment and try again.`
                : String(base)
        );
        // Attach status so callers can do robust branching (e.g. retry anonymous on 401).
        e.status = response.status;
        throw e;
    }

    return response.json();
};

/**
 * Tries GET URLs in order; on 404 only, tries the next candidate (for GIF routes that differ by deploy).
 * @param {string[]} urls
 */
export async function apiRequestFirstOk(urls) {
    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    let lastErr;
    const tried = [];
    for (const url of list) {
        try {
            tried.push(url);
            return await apiRequest(url);
        } catch (e) {
            lastErr = e;
            if (e.status === 404) continue;
            throw e;
        }
    }
    if (lastErr && lastErr.status === 404 && tried.length > 1) {
        throw new Error(`GIF endpoint not found. Tried: ${tried.join(" , ")}`);
    }
    throw lastErr ?? new Error('Request failed');
}

/** Candidate GET URLs for trending GIFs (backend may use /giphy/ or /gifs/). */
export function buildGifsTrendingUrls() {
    const custom = process.env.NEXT_PUBLIC_GIFS_TRENDING_URL;
    const b = FRIEND_SERVICE_URL;
    return [...new Set([custom, `${b}/me/giphy/trending`, `${b}/me/gifs/trending`].filter(Boolean))];
}

/** Candidate GET URLs for GIF search. */
export function buildGifsSearchUrls(q) {
    const qe = encodeURIComponent(q || '');
    const custom = process.env.NEXT_PUBLIC_GIFS_SEARCH_URL;
    const b = FRIEND_SERVICE_URL;
    if (custom) {
        if (custom.includes('{{q}}')) return [custom.replace(/\{\{q\}\}/g, qe)];
        return [`${custom}${custom.includes('?') ? '&' : '?'}q=${qe}`];
    }
    return [...new Set([`${b}/me/giphy/search?q=${qe}`, `${b}/me/gifs/search?q=${qe}`])];
}
