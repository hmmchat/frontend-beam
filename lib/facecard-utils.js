import { isPlaceholderDisplayPicture } from "@/lib/profile-ready";

export const calculateProgress = (userData) => {
  if (!userData) return 0;
  let score = 0;
  if (userData.username) score += 5;
  if (userData.dateOfBirth) score += 5;
  if (userData.gender) score += 5;
  if (userData.intent && userData.intent !== "Here to meet strangers and here to meet strangers and overthink later.") score += 10;
  if (userData.displayPictureUrl) score += 15;

  // Photos
  const additionalPhotos = userData.photos?.filter(p => p.url) || [];
  if (additionalPhotos.length >= 1) score += 10;
  if (additionalPhotos.length >= 2) score += 10;

  // Categories
  if (userData.interests?.length >= 1) score += 10;

  if (userData.values?.length >= 1) score += 10;

  if (userData.brandPreferences?.length >= 3) score += 10;
  else if (userData.brandPreferences?.length >= 1) score += 5;

  if (userData.musicPreference) score += 10;

  return Math.min(score, 100);
};

// Zodiac calculation is now handled by the backend. 
// Frontend static data has been removed.
export const getZodiac = (dateStr) => {
  return null;
};

export const calculateAge = (dateStr) => {
  if (!dateStr) return 0;
  const dob = new Date(dateStr);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

/** Human-readable title for a discovery LOCATION card `city` value. */
export function formatDiscoveryCityTitle(city) {
  if (city == null || city === '' || city === 'null') return 'Anywhere';
  const c = String(city);
  if (c === 'ANYWHERE') return 'Anywhere';
  return c.replace(/_/g, ' ');
}

/**
 * Synthetic "user" for FaceCard / FaceCard4 when showing a discovery city LOCATION card.
 * Uses admin-uploaded `faceCardImageUrl` as the portrait when present.
 * Brands + song come from the discovery city catalog when set by ops.
 * No user-count numbers — intent comes from the city catalog.
 */
export function buildDiscoveryCityFaceCardUser({
  city,
  faceCardImageUrl,
  intent,
  label,
  brands,
  musicPreference,
}) {
  const title = label || formatDiscoveryCityTitle(city);
  const brandList = Array.isArray(brands)
    ? brands
        .filter((b) => b && (b.name || b.logoUrl))
        .map((b) => ({
          name: b.name,
          logoUrl: b.logoUrl || undefined,
        }))
    : [];
  const song =
    musicPreference && musicPreference.name && musicPreference.artist
      ? {
          name: musicPreference.name,
          artist: musicPreference.artist,
          albumArtUrl: musicPreference.albumArtUrl || undefined,
        }
      : null;
  return {
    id: `location:${city ?? 'anywhere'}`,
    username: title,
    type: 'LOCATION',
    isLocationCard: true,
    city: null,
    preferredCity: null,
    /** No outlined age chip — same header rhythm as people cards, without a fake age. */
    hideFacecardAge: true,
    intent: (intent && String(intent).trim()) || 'The vibe’s still up here.',
    displayPictureUrl: faceCardImageUrl || undefined,
    faceCardImageUrl: faceCardImageUrl || undefined,
    photos: faceCardImageUrl ? [faceCardImageUrl] : [],
    musicPreference: song,
    brandPreferences: [],
    brands: brandList,
    zodiac: null,
    videoEnabled: false,
    videoOn: false,
  };
}

export const getFacecardPhotos = (user) => {
  if (!user) return ['/assets/placeholder-user.jpg'];

  // Discovery LOCATION cards: portrait is the admin city face image.
  if (user.type === 'LOCATION' || user.isLocationCard) {
    const loc = user.faceCardImageUrl || user.face_card_image_url;
    if (loc) return [loc];
  }

  const photos = [];

  // Check both camelCase and snake_case
  const dp = user.displayPictureUrl || user.display_picture_url;
  if (dp) photos.push(dp);

  // Photos can be objects { url, order } / { photoUrl } (discovery pages) or just strings
  const rawPhotos = user.photos || user.gallery || user.pages || [];
  if (Array.isArray(rawPhotos)) {
    const additionalPhotos = [...rawPhotos]
      .sort((a, b) => {
        // If objects with order, sort by order. Otherwise don't change.
        if (typeof a === 'object' && typeof b === 'object') {
          return (a.order || 0) - (b.order || 0);
        }
        return 0;
      })
      .map(p => {
        if (typeof p === 'string') return p;
        return p.url || p.image || p.imageUrl || p.photoUrl;
      })
      .filter(url => url && url !== (dp || ""));
    photos.push(...additionalPhotos);
  }

  // De-duplicate final URLs. Display picture + up to 2 extras = 3 max.
  const uniquePhotos = [...new Set(photos)].slice(0, 3);

  if (uniquePhotos.length === 0) {
    uniquePhotos.push('/assets/placeholder-user.jpg');
  }
  return uniquePhotos;
};

/** Facecard editor slots: 0 = display picture, 1–2 = gallery order 0–1. */
export function getFacecardSlotUrl(user, slotIndex) {
  if (slotIndex === 0) {
    const url = user?.displayPictureUrl;
    return isPlaceholderDisplayPicture(url) ? "" : url;
  }
  return user?.photos?.find((p) => p.order === slotIndex - 1)?.url || "";
}

export function facecardSlotHasPhoto(user, slotIndex) {
  return Boolean(getFacecardSlotUrl(user, slotIndex));
}

export function swapFacecardPhotoSlots(user, fromSlot, toSlot) {
  if (!user || fromSlot === toSlot) return user;
  const fromUrl = getFacecardSlotUrl(user, fromSlot);
  const toUrl = getFacecardSlotUrl(user, toSlot);
  if (!fromUrl || !toUrl) return user;

  let displayPictureUrl = user.displayPictureUrl;
  const photos = (user.photos || []).map((p) => ({ ...p }));

  const write = (slot, url) => {
    if (slot === 0) {
      displayPictureUrl = url;
      return;
    }
    const order = slot - 1;
    const i = photos.findIndex((p) => p.order === order);
    if (i >= 0) photos[i] = { ...photos[i], url };
    else photos.push({ url, order });
  };

  write(fromSlot, toUrl);
  write(toSlot, fromUrl);
  return { ...user, displayPictureUrl, photos };
}
