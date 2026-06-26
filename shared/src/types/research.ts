export interface ResearchSource {
  id: string;
  title: string;
  authors?: string[];
  year?: number;
  venue?: string;
  url?: string;
  pdfUrl?: string;
  abstract?: string;
  doi?: string;
  openAccess?: boolean;
  source: "openalex" | "crossref" | "semantic_scholar" | "local";
}

export interface ResearchSearchResult {
  query: string;
  total: number;
  sources: ResearchSource[];
}
