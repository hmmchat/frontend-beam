// API Configuration - Direct connection to individual microservices
// Each service runs on its own port

// Service URLs
const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3002';
const FILES_SERVICE_URL = process.env.NEXT_PUBLIC_FILES_SERVICE_URL || 'http://localhost:3008';
const FRIEND_SERVICE_URL = process.env.NEXT_PUBLIC_FRIEND_SERVICE_URL || 'http://localhost:3009';
const DISCOVERY_SERVICE_URL = process.env.NEXT_PUBLIC_DISCOVERY_SERVICE_URL || 'http://localhost:3004';
const WALLET_SERVICE_URL = process.env.NEXT_PUBLIC_WALLET_SERVICE_URL || 'http://localhost:3006';
const STREAMING_SERVICE_URL = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3005';

// API Endpoints - Direct to individual services
export const API = {
    // Auth endpoints (port 3001)
    AUTH: {
        GOOGLE: `${AUTH_SERVICE_URL}/auth/google`,
        FACEBOOK: `${AUTH_SERVICE_URL}/auth/facebook`,
        PHONE_SEND_OTP: `${AUTH_SERVICE_URL}/auth/phone/send-otp`,
        PHONE_VERIFY: `${AUTH_SERVICE_URL}/auth/phone/verify`,
    },

    // User endpoints (port 3002)
    USERS: {
        GET_USER: (userId) => `${USER_SERVICE_URL}/users/${userId}`,
        CREATE_PROFILE: (userId) => `${USER_SERVICE_URL}/users/${userId}/profile`,
        UPDATE_PROFILE: `${USER_SERVICE_URL}/me/profile`,
        ADD_PHOTO: `${USER_SERVICE_URL}/me/photos`,
        UPDATE_INTENT: `${USER_SERVICE_URL}/me/intent`,
        UPDATE_INTERESTS: `${USER_SERVICE_URL}/me/interests`,
        UPDATE_VALUES: `${USER_SERVICE_URL}/me/values`,
        UPDATE_BRANDS: `${USER_SERVICE_URL}/me/brand-preferences`,
    },

    // Files endpoints (port 3008)
    FILES: {
        UPLOAD: `${FILES_SERVICE_URL}/files/upload`,
    },

    // Friends endpoints (port 3009)
    FRIENDS: {
        GET_INBOX_CONVERSATIONS: `${FRIEND_SERVICE_URL}/me/conversations/inbox`,
        GET_RECEIVED_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/received-requests`,
        GET_SENT_REQUESTS: `${FRIEND_SERVICE_URL}/me/conversations/sent-requests`,
        GET_FRIENDS_WALL: `${FRIEND_SERVICE_URL}/me/friends/wall`,
        GET_CONVERSATION_MESSAGES: (conversationId) => `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages`,
        SEND_MESSAGE: (conversationId) => `${FRIEND_SERVICE_URL}/me/conversations/${conversationId}/messages`,
    },

    // Discovery endpoints (port 3004 - discovery-service)
    DISCOVERY: {
        GET_METRICS: (userId) => `${DISCOVERY_SERVICE_URL}/metrics?userId=${userId}`,
        GET_CARD: (userId, sessionId, soloOnly) => `${DISCOVERY_SERVICE_URL}/discovery/test/card?userId=${userId}&sessionId=${sessionId}&soloOnly=${soloOnly || false}`,
        PROCEED: `${DISCOVERY_SERVICE_URL}/discovery/test/proceed`,
        RAINCHECK: `${DISCOVERY_SERVICE_URL}/discovery/test/raincheck`,
        SELECT_LOCATION: `${DISCOVERY_SERVICE_URL}/discovery/test/select-location`,
        MY_ROOM: (userId) => `${DISCOVERY_SERVICE_URL}/discovery/test/my-room?userId=${userId}`,
        GENDER_FILTERS: (userId) => `${DISCOVERY_SERVICE_URL}/gender-filters/test?userId=${userId}`,
        APPLY_GENDER_FILTER: `${DISCOVERY_SERVICE_URL}/gender-filters/test/apply`,
        LOCATION_PREFERENCE: (userId) => `${DISCOVERY_SERVICE_URL}/location/test/preference?userId=${userId}`,
        UPDATE_LOCATION_PREFERENCE: `${DISCOVERY_SERVICE_URL}/location/test/preference`,
        SEARCH_CITIES: (q) => `${DISCOVERY_SERVICE_URL}/location/search?q=${q}`,
        GET_CITIES: `${DISCOVERY_SERVICE_URL}/location/cities`,
        GET_INTERESTS: `${USER_SERVICE_URL}/interests`,
        GET_VALUES: `${USER_SERVICE_URL}/values`,
        GET_BRANDS: `${USER_SERVICE_URL}/brands`,
    },

    // Streaming endpoints (port 3005 - streaming-service)
    STREAMING: {
        // Get the active room a user is currently in (no auth required)
        GET_USER_ROOM: (userId) => `${STREAMING_SERVICE_URL}/streaming/test/users/${userId}/room`,
        LEAVE_ROOM: (roomId) => `${STREAMING_SERVICE_URL}/streaming/test/rooms/${roomId}/leave`,
    },

    // Wallet endpoints (port 3006 - wallet-service)
    WALLET: {
        GET_BALANCE: `${WALLET_SERVICE_URL}/me/balance`,
    },

    // Streaming endpoints (port 3005 - streaming-service)
    STREAMING: {
        CREATE_ROOM: `${STREAMING_SERVICE_URL}/streaming/rooms`,
    }
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
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
};
