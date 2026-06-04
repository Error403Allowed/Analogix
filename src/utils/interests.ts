export const HOBBY_OPTIONS = [
  { id: "sports",  label: "Sports" },
  { id: "gaming",  label: "Gaming" },
  { id: "music",   label: "Music" },
  { id: "cooking", label: "Cooking" },
  { id: "art",     label: "Art & Design" },
  { id: "movies",  label: "Movies & TV" },
  { id: "nature",  label: "Nature" },
  { id: "tech",    label: "Technology" },
  { id: "reading", label: "Reading" },
  { id: "travel",  label: "Travel" },
] as const;

export type HobbyId = (typeof HOBBY_OPTIONS)[number]["id"];

export const POPULAR_INTERESTS: Record<HobbyId, string[]> = {
  sports:   ["Soccer", "Basketball", "Tennis", "Cricket", "Formula 1", "Swimming", "Rugby", "Netball"],
  gaming:   ["RPG", "FPS", "Strategy", "Simulation", "Racing", "Sports Games", "Indie"],
  music:    ["Pop", "Hip-Hop", "Rock", "Classical", "K-Pop", "Jazz", "EDM"],
  cooking:  ["Baking", "Italian", "Mexican", "Asian", "Desserts", "Meal Prep", "Grilling"],
  art:      ["Drawing", "Painting", "Digital Art", "Graphic Design", "Photography", "Animation", "Sculpture"],
  movies:   ["Action", "Comedy", "Sci-Fi", "Fantasy", "Horror", "Drama", "Anime"],
  nature:   ["Hiking", "Camping", "Gardening", "Wildlife", "Beaches", "Mountains", "Sustainability"],
  tech:     ["AI", "Robotics", "Programming", "Gadgets", "Cybersecurity", "Game Dev", "Web Dev"],
  reading:  ["Fantasy", "Mystery", "Sci-Fi", "Non-fiction", "Manga", "Biography", "Poetry"],
  travel:   ["Road Trips", "Beaches", "Cities", "Mountains", "Theme Parks", "Historical Sites", "Backpacking"],
};

export function buildHobbyDetails(
  selectedIds: string[],
  subtopics: Record<string, string[]>
): { hobbies: string[]; hobbyIds: string[]; hobbyDetails: Record<string, string> } {
  const hobbyDetails: Record<string, string> = {};
  for (const id of selectedIds) {
    const subs = subtopics[id] ?? [];
    if (subs.length > 0) {
      hobbyDetails[id] = subs.join(", ");
    }
  }
  const hobbyIds = [...selectedIds];
  const hobbies = selectedIds.map((id) => {
    const label = HOBBY_OPTIONS.find((h) => h.id === id)?.label ?? id;
    const subs = subtopics[id] ?? [];
    return subs.length > 0 ? `${label} (${subs.join(", ")})` : label;
  });
  return { hobbies, hobbyIds, hobbyDetails };
}
