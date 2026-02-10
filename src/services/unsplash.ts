/**
 * Optional: fetch a single relevant image from Unsplash for chat.
 * Set VITE_UNSPLASH_ACCESS_KEY in .env to enable inline images in the chatbot.
 * Get a key at https://unsplash.com/developers (free tier: 50 requests/hour).
 */

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;
const UNSPLASH_API = "https://api.unsplash.com";

export function isUnsplashConfigured(): boolean {
  return Boolean(UNSPLASH_ACCESS_KEY?.trim());
}

/**
 * Returns a single image URL for the given search query, or null if no key or no result.
 */
export async function fetchImageForQuery(query: string): Promise<string | null> {
  if (!isUnsplashConfigured()) return null;

  const trimmed = query.trim().slice(0, 100);
  if (!trimmed) return null;

  try {
    const params = new URLSearchParams({
      query: trimmed,
      per_page: "1",
      orientation: "landscape",
    });
    const res = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data.results?.[0];
    return first?.urls?.regular || first?.urls?.small || null;
  } catch {
    return null;
  }
}
