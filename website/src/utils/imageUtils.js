const GOOGLE_MAPS_EMBED_KEY = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

/**
 * Extract a usable image URL from a property image entry.
 * Handles string URLs, {url: "..."} objects, and appends the API key
 * to Google Places photo URLs when missing.
 */
export function getImageUrl(img) {
  if (!img) return null;
  const url = typeof img === 'string' ? img : img.url || null;
  if (!url) return null;
  if (url.includes('maps.googleapis.com/maps/api/place/photo') && !url.includes('key=')) {
    return url + '&key=' + GOOGLE_MAPS_EMBED_KEY;
  }
  return url;
}

export const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=60';
