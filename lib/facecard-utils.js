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
 * No user-count numbers — intent comes from the city catalog.
 */
export function buildDiscoveryCityFaceCardUser({ city, faceCardImageUrl, intent, label }) {
  const title = label || formatDiscoveryCityTitle(city);
  return {
    id: `location:${city ?? 'anywhere'}`,
    username: title,
    city: null,
    preferredCity: null,
    /** No outlined age chip — same header rhythm as people cards, without a fake age. */
    hideFacecardAge: true,
    intent: (intent && String(intent).trim()) || 'The vibe’s still up here.',
    displayPictureUrl: faceCardImageUrl || undefined,
    photos: [],
    musicPreference: null,
    brandPreferences: [],
    brands: [],
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

  // Photos can be objects { url, order } or just strings
  const rawPhotos = user.photos || user.gallery || [];
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
        return p.url || p.image || p.imageUrl;
      })
      .filter(url => url && url !== (dp || ""));
    photos.push(...additionalPhotos);
  }

  // De-duplicate final URLs
  const uniquePhotos = [...new Set(photos)];

  if (uniquePhotos.length === 0) {
    uniquePhotos.push('/assets/placeholder-user.jpg');
  }
  return uniquePhotos;
};
