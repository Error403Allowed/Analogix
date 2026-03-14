import { NextResponse } from "next/server";
import type { ResearchSource } from "@/types/research";

export const runtime = "nodejs";

const truncate = (text: string, max = 360) =>
  text.length > max ? text.slice(0, max).trim() + "…" : text.trim();

const stripHtml = (text: string) => text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const invertedIndexToText = (index: Record<string, number[]>): string => {
  const items: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(index)) {
    positions.forEach(pos => items.push({ pos, word }));
  }
  items.sort((a, b) => a.pos - b.pos);
  return items.map(i => i.word).join(" ");
};

const keyFor = (source: ResearchSource): string => {
  if (source.doi) return `doi:${source.doi.toLowerCase()}`;
  if (source.url) return `url:${source.url.toLowerCase()}`;
  const title = source.title?.toLowerCase().trim() || "untitled";
  const year = source.year ? String(source.year) : "";
  return `title:${title}:${year}`;
};

const isAcademic = (source: ResearchSource): boolean => {
  if (!source.title) return false;
  if (source.doi) return true;
  if (source.venue) return true;
  return Boolean(source.year);
};

const fetchOpenAlex = async (query: string, limit: number): Promise<ResearchSource[]> => {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((item: any) => {
    const authors = Array.isArray(item.authorships)
      ? item.authorships.map((a: any) => a?.author?.display_name).filter(Boolean)
      : [];
    const abstract = item.abstract_inverted_index
      ? invertedIndexToText(item.abstract_inverted_index)
      : "";
    const url = item.open_access?.oa_url || item.primary_location?.landing_page_url || item.id || "";
    return {
      id: String(item.id || item.doi || item.display_name || Math.random()),
      title: String(item.display_name || "Untitled"),
      url: url || undefined,
      pdfUrl: item.open_access?.oa_url || undefined,
      authors,
      year: item.publication_year || undefined,
      venue: item.host_venue?.display_name || undefined,
      abstract: abstract ? truncate(abstract) : undefined,
      doi: item.doi ? String(item.doi).replace("https://doi.org/", "") : undefined,
      openAccess: item.open_access?.is_oa ?? undefined,
      source: "openalex",
    } satisfies ResearchSource;
  }).filter(isAcademic);
};

const fetchCrossref = async (query: string, limit: number): Promise<ResearchSource[]> => {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data?.message?.items) ? data.message.items : [];
  return items.map((item: any) => {
    const title = Array.isArray(item.title) ? item.title[0] : item.title;
    const authors = Array.isArray(item.author)
      ? item.author.map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean)
      : [];
    const year = Array.isArray(item.issued?.["date-parts"]) ? item.issued["date-parts"][0]?.[0] : undefined;
    const abstract = item.abstract ? stripHtml(item.abstract) : "";
    const venue = Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"];
    return {
      id: String(item.DOI || item.URL || title || Math.random()),
      title: String(title || "Untitled"),
      url: item.URL || undefined,
      authors,
      year: year || undefined,
      venue: venue || undefined,
      abstract: abstract ? truncate(abstract) : undefined,
      doi: item.DOI || undefined,
      openAccess: item["license"]?.length ? true : undefined,
      source: "crossref",
    } satisfies ResearchSource;
  }).filter(isAcademic);
};

const fetchSemanticScholar = async (query: string, limit: number): Promise<ResearchSource[]> => {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,abstract,url,venue,externalIds,isOpenAccess,openAccessPdf`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];
  return items.map((item: any) => {
    const authors = Array.isArray(item.authors)
      ? item.authors.map((a: any) => a?.name).filter(Boolean)
      : [];
    return {
      id: String(item.paperId || item.externalIds?.DOI || item.url || Math.random()),
      title: String(item.title || "Untitled"),
      url: item.url || undefined,
      pdfUrl: item.openAccessPdf?.url || undefined,
      authors,
      year: item.year || undefined,
      venue: item.venue || undefined,
      abstract: item.abstract ? truncate(item.abstract) : undefined,
      doi: item.externalIds?.DOI || undefined,
      openAccess: item.isOpenAccess ?? undefined,
      source: "semanticscholar",
    } satisfies ResearchSource;
  }).filter(isAcademic);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query: string = body.query || "";
    const limit: number = Math.max(3, Math.min(Number(body.limit || 8), 12));

    if (!query.trim()) {
      return NextResponse.json({ sources: [], query });
    }

    const [openalex, crossref, semantic] = await Promise.allSettled([
      fetchOpenAlex(query, limit),
      fetchCrossref(query, limit),
      fetchSemanticScholar(query, limit),
    ]);

    const results = [
      ...(openalex.status === "fulfilled" ? openalex.value : []),
      ...(crossref.status === "fulfilled" ? crossref.value : []),
      ...(semantic.status === "fulfilled" ? semantic.value : []),
    ];

    const seen = new Set<string>();
    const deduped: ResearchSource[] = [];
    for (const source of results) {
      const key = keyFor(source);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(source);
    }

    return NextResponse.json({ sources: deduped.slice(0, limit), query });
  } catch (error) {
    return NextResponse.json({ sources: [], error: error instanceof Error ? error.message : "Search failed" }, { status: 200 });
  }
}
