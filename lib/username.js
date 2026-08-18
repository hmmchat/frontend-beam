export const USERNAME_MAX_LEN = 8;
export const USERNAME_MIN_LEN = 3;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_ ]+$/;

/** Match user-service DisplayNameSchema: map unicode spaces to ASCII (keeps intentional double spaces). */
export function normalizeDisplayNameWhitespace(s) {
  return String(s ?? "").replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
}

/** Live check while typing — same 8-char cap as onboarding. */
export function getLiveNameError(raw) {
  const username = normalizeDisplayNameWhitespace(raw).trim();
  if (username.length > USERNAME_MAX_LEN) {
    return `Name must be at most ${USERNAME_MAX_LEN} characters.`;
  }
  return "";
}

/** Full save-time validation (matches backend DisplayNameSchema). */
export function getNameValidationError(raw) {
  const username = normalizeDisplayNameWhitespace(raw).trim();
  if (!username) return "Please enter your name.";
  if (username.length < USERNAME_MIN_LEN) {
    return `Name must be at least ${USERNAME_MIN_LEN} characters.`;
  }
  if (username.length > USERNAME_MAX_LEN) {
    return `Name must be at most ${USERNAME_MAX_LEN} characters.`;
  }
  if (!DISPLAY_NAME_PATTERN.test(username)) {
    return "Name can only contain letters, numbers, underscores, and spaces";
  }
  return "";
}

/** Cap usernames for on-screen display. Existing longer names stay stored as-is. */
export function displayUsername(name, fallback = "User") {
  const s = String(name ?? "").trim();
  if (!s) return fallback;
  return s.length > USERNAME_MAX_LEN ? s.slice(0, USERNAME_MAX_LEN) : s;
}

/** Location cards store the city title in `username` — do not cap those. */
export function displayCardName(user, fallback = "User") {
  if (user?.isLocationCard || user?.type === "LOCATION") {
    return String(user?.username ?? "").trim() || fallback;
  }
  return displayUsername(user?.username, fallback);
}
