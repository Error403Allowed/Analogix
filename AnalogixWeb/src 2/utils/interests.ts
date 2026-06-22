export const HOBBY_OPTIONS = [
  { id: "sports", label: "Sports" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "cooking", label: "Cooking" },
  { id: "art", label: "Art & Design" },
  { id: "movies", label: "Movies & TV" },
  { id: "nature", label: "Nature" },
  { id: "tech", label: "Technology" },
  { id: "reading", label: "Reading" },
  { id: "travel", label: "Travel" }
] as const;

export type HobbyId = (typeof HOBBY_OPTIONS)[number]["id"];

export const POPULAR_INTERESTS: Record<HobbyId, string[]> = {
  sports: ["Soccer", "Basketball", "Tennis", "Cricket", "Formula 1", "Swimming", "Rugby", "Netball"],
  gaming: ["RPG", "FPS", "Strategy", "Simulation", "Racing", "Sports Games", "Indie"],
  music: ["Pop", "Hip-Hop", "Rock", "Classical", "K-Pop", "Jazz", "EDM"],
  cooking: ["Baking", "Italian", "Mexican", "Asian", "Desserts", "Meal Prep", "Grilling"],
  art: ["Drawing", "Painting", "Digital Art", "Graphic Design", "Photography", "Animation", "Sculpture"],
  movies: ["Action", "Comedy", "Sci-Fi", "Fantasy", "Horror", "Drama", "Anime"],
  nature: ["Hiking", "Camping", "Gardening", "Wildlife", "Beaches", "Mountains", "Sustainability"],
  tech: ["AI", "Robotics", "Programming", "Gadgets", "Cybersecurity", "Game Dev", "Web Dev"],
  reading: ["Fantasy", "Mystery", "Sci-Fi", "Non-fiction", "Manga", "Biography", "Poetry"],
  travel: ["Road Trips", "Beaches", "Cities", "Mountains", "Theme Parks", "Historical Sites", "Backpacking"]
};

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const splitDetails = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const ensureGamingSuffix = (items: string[]) =>
  items.map((item) => (/\bgame\b/i.test(item) ? item : `${item} games`));

const extractParenDetails = (label: string) => {
  const match = label.match(/^([^(]+)\(([^)]+)\)/);
  if (!match) return [];
  const base = match[1].trim();
  const details = splitDetails(match[2]);
  const hobbyId = HOBBY_OPTIONS.find(
    (hobby) => hobby.label.toLowerCase() === base.toLowerCase()
  )?.id;
  if (hobbyId === "gaming") return ensureGamingSuffix(details);
  return details;
};

export const buildInterestList = (
  prefs: unknown,
  fallback: string[] = ["gaming", "sports"]
) => {
  if (!prefs || typeof prefs !== "object") return fallback;
  const prefsRecord = prefs as Record<string, unknown>;
  const hobbies = Array.isArray(prefsRecord.hobbies)
    ? (prefsRecord.hobbies as string[]).filter(Boolean)
    : [];
  const hobbyDetails =
    prefsRecord.hobbyDetails && typeof prefsRecord.hobbyDetails === "object"
      ? (prefsRecord.hobbyDetails as Record<string, string>)
      : {};
  const detailItems = [
    ...Object.entries(hobbyDetails).flatMap(([id, detail]) => {
      const details = splitDetails(detail);
      if (id === "gaming") return ensureGamingSuffix(details);
      return details;
    }),
    ...hobbies.flatMap(extractParenDetails)
  ];
  const idsWithDetails = new Set(Object.keys(hobbyDetails));
  const hobbyIds = Array.isArray(prefsRecord.hobbyIds)
    ? (prefsRecord.hobbyIds as string[])
    : [];
  const labelsFromIds = hobbyIds
    .filter((id) => !idsWithDetails.has(id))
    .map((id) => HOBBY_OPTIONS.find((hobby) => hobby.id === id)?.label || id);
  const hobbiesWithoutDetails = hobbies
    .filter((label) => !/\(.+\)/.test(label))
    .map((label) => label.trim())
    .filter(Boolean);
  const fallbackLabels = labelsFromIds.length > 0 ? labelsFromIds : hobbiesWithoutDetails;
  const result =
    detailItems.length > 0
      ? [...detailItems, ...fallbackLabels]
      : fallbackLabels.length > 0
        ? fallbackLabels
        : fallback;
  return dedupe(result);
};
