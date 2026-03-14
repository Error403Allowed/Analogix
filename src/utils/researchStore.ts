import type { ResearchSource, SavedResearchSource } from "@/types/research";

const STORAGE_KEY = "research_library_v1";

const getKey = (source: ResearchSource): string => {
  if (source.doi) return `doi:${source.doi.toLowerCase()}`;
  if (source.url) return `url:${source.url.toLowerCase()}`;
  const title = source.title?.toLowerCase().trim() || "untitled";
  const year = source.year ? String(source.year) : "";
  return `title:${title}:${year}`;
};

const readAll = (): SavedResearchSource[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (items: SavedResearchSource[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(new Event("researchLibraryUpdated"));
};

export const researchStore = {
  getAll: (): SavedResearchSource[] => readAll(),
  isSaved: (source: ResearchSource): boolean => {
    const key = getKey(source);
    return readAll().some(item => getKey(item) === key);
  },
  add: (source: ResearchSource): void => {
    const items = readAll();
    const key = getKey(source);
    if (items.some(item => getKey(item) === key)) return;
    const saved: SavedResearchSource = {
      ...source,
      savedAt: new Date().toISOString(),
    };
    items.unshift(saved);
    writeAll(items);
  },
  remove: (source: ResearchSource): void => {
    const key = getKey(source);
    const next = readAll().filter(item => getKey(item) !== key);
    writeAll(next);
  },
  clear: (): void => {
    writeAll([]);
  },
};
