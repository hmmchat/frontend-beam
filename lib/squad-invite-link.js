const PENDING_SQUAD_INVITE_TOKEN_KEY = "pendingSquadInviteToken";
const POST_ONBOARDING_REDIRECT_PATH_KEY = "postOnboardingRedirectPath";

function hasWindow() {
  return typeof window !== "undefined";
}

export function setPendingSquadInviteToken(token) {
  if (!hasWindow()) return;
  if (!token) return;
  localStorage.setItem(PENDING_SQUAD_INVITE_TOKEN_KEY, String(token));
}

export function getPendingSquadInviteToken() {
  if (!hasWindow()) return "";
  return localStorage.getItem(PENDING_SQUAD_INVITE_TOKEN_KEY) || "";
}

export function clearPendingSquadInviteToken() {
  if (!hasWindow()) return;
  localStorage.removeItem(PENDING_SQUAD_INVITE_TOKEN_KEY);
}

export function setPostOnboardingRedirectPath(path) {
  if (!hasWindow()) return;
  if (!path) return;
  localStorage.setItem(POST_ONBOARDING_REDIRECT_PATH_KEY, String(path));
}

export function getPostOnboardingRedirectPath() {
  if (!hasWindow()) return "";
  return localStorage.getItem(POST_ONBOARDING_REDIRECT_PATH_KEY) || "";
}

export function clearPostOnboardingRedirectPath() {
  if (!hasWindow()) return;
  localStorage.removeItem(POST_ONBOARDING_REDIRECT_PATH_KEY);
}

