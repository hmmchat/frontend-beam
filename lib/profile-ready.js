const PLACEHOLDER_PHOTO_RE = /via\.placeholder\.com/i;

/** Empty, blob/data previews, or the old onboarding placeholder URL. */
export function isPlaceholderDisplayPicture(url) {
  if (typeof url !== "string") return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return true;
  return PLACEHOLDER_PHOTO_RE.test(trimmed);
}

/** Step 1: a newly chosen file, a blob preview, or an already-uploaded real URL. */
export function hasOnboardingPhotoSelected(previewUrl, file) {
  if (file) return true;
  if (!previewUrl || typeof previewUrl !== "string") return false;
  const trimmed = previewUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return true;
  return !PLACEHOLDER_PHOTO_RE.test(trimmed);
}

export function getMatchmakingProfileGap(user) {
  if (!user) return "Incomplete profile";
  if (!String(user.username || "").trim()) return "Name is required";
  if (!user.dateOfBirth) return "Date of birth is required";
  if (!user.gender) return "Gender is required";
  if (isPlaceholderDisplayPicture(user.displayPictureUrl)) return "A profile photo is required";
  if (!String(user.intent || "").trim()) return "Intent is required";
  return null;
}

export function isMatchmakingProfileComplete(user) {
  return getMatchmakingProfileGap(user) == null;
}
