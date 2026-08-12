import type { ResearchSource } from "@/types/research";

export const formatDisplayUrl = (url?: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    const trimmedPath = path.length > 28 ? `${path.slice(0, 26)}…` : path;
    return `${parsed.hostname}${trimmedPath}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 38)}…` : url;
  }
};

export const formatAuthors = (authors?: string[]) => {
  if (!authors || authors.length === 0) return "Unknown authors";
  if (authors.length <= 2) return authors.join(", ");
  return `${authors[0]}, ${authors[1]} et al.`;
};

export const sourceKey = (source: ResearchSource): string => {
  if (source.doi) return `doi:${source.doi.toLowerCase()}`;
  if (source.url) return `url:${source.url.toLowerCase()}`;
  const title = source.title?.toLowerCase().trim() || "untitled";
  const year = source.year ? String(source.year) : "";
  return `title:${title}:${year}`;
};
