import type { ResearchSource } from "@analogix/shared";
import { logger } from "../logger.js";

interface SearchOptions {
  query: string;
  limit: number;
  yearFrom?: number;
  yearTo?: number;
  openAccessOnly: boolean;
}

/**
 * Searches OpenAlex + Crossref + Semantic Scholar.
 * Returns merged, de-duplicated results. The web app has a richer version
 * (AnalogixWeb/src/app/api/research/search/route.ts) — port that here as needed.
 */
export async function searchAcademicPapers(opts: SearchOptions): Promise<ResearchSource[]> {
  const [openAlex, crossref] = await Promise.allSettled([
    searchOpenAlex(opts),
    searchCrossref(opts),
  ]);
  const out: ResearchSource[] = [];
  if (openAlex.status === "fulfilled") out.push(...openAlex.value);
  if (crossref.status === "fulfilled") out.push(...crossref.value);
  // De-dupe by DOI or title
  const seen = new Set<string>();
  return out.filter((s) => {
    const key = s.doi ?? s.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchOpenAlex(opts: SearchOptions): Promise<ResearchSource[]> {
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", opts.query);
    url.searchParams.set("per-page", String(Math.min(opts.limit, 50)));
    if (opts.yearFrom) url.searchParams.set("from_publication_date", `${opts.yearFrom}-01-01`);
    if (opts.yearTo) url.searchParams.set("to_publication_date", `${opts.yearTo}-12-31`);
    if (opts.openAccessOnly) url.searchParams.set("filter", "is_oa:true");
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    return (json.results ?? []).map((work) => {
      const authors = (work.authorships as Array<{ author?: { display_name?: string } }> | undefined)
        ?.map((a) => a.author?.display_name)
        .filter(Boolean) as string[] | undefined;
      const doi = typeof work.doi === "string" ? work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : undefined;
      const venue = (work.primary_location as { source?: { display_name?: string } } | undefined)?.source?.display_name;
      return {
        id: String(work.id ?? doi ?? work.title),
        title: String(work.title ?? "Untitled"),
        authors,
        year: typeof work.publication_year === "number" ? work.publication_year : undefined,
        venue,
        url: typeof work.doi === "string" ? work.doi : undefined,
        pdfUrl: (work.best_oa_location as { pdf_url?: string } | undefined)?.pdf_url,
        abstract: reconstructAbstract(work.abstract_inverted_index as Record<string, number[]> | undefined),
        doi,
        openAccess: Boolean((work.open_access as { is_oa?: boolean } | undefined)?.is_oa),
        source: "openalex" as const,
      };
    });
  } catch (err) {
    logger.warn({ err }, "[research] OpenAlex search failed");
    return [];
  }
}

async function searchCrossref(opts: SearchOptions): Promise<ResearchSource[]> {
  try {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query", opts.query);
    url.searchParams.set("rows", String(Math.min(opts.limit, 50)));
    const res = await fetch(url.toString(), { headers: { "User-Agent": "AnalogixGraphQL/0.1" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { message?: { items?: Array<Record<string, unknown>> } };
    return (json.message?.items ?? []).map((item) => ({
      id: String(item.DOI ?? item.URL ?? item.title),
      title: String(Array.isArray(item.title) ? item.title[0] : item.title ?? "Untitled"),
      authors: (item.author as Array<{ given?: string; family?: string }> | undefined)?.map(
        (a) => `${a.given ?? ""} ${a.family ?? ""}`.trim()
      ),
      year: typeof item.issued === "object" ? Number((item.issued as { "date-parts"?: number[][] })["date-parts"]?.[0]?.[0]) : undefined,
      venue: Array.isArray((item as Record<string, unknown>).container_title)
        ? ((item as Record<string, unknown>).container_title as string[])[0]
        : undefined,
      url: typeof item.URL === "string" ? item.URL : undefined,
      doi: typeof item.DOI === "string" ? item.DOI : undefined,
      source: "crossref" as const,
    }));
  } catch (err) {
    logger.warn({ err }, "[research] Crossref search failed");
    return [];
  }
}

function reconstructAbstract(inverted: Record<string, number[]> | undefined): string | undefined {
  if (!inverted) return undefined;
  const positions: Array<[string, number]> = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs) positions.push([word, i]);
  }
  positions.sort((a, b) => a[1] - b[1]);
  return positions.map(([w]) => w).join(" ");
}
