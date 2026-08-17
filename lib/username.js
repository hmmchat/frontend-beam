export const USERNAME_MAX_LEN = 8;

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
