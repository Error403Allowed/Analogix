export type ResearchSourceType = "openalex" | "crossref" | "semanticscholar" | "local";

export interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  pdfUrl?: string;
  authors?: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  doi?: string;
  openAccess?: boolean;
  source: ResearchSourceType;
}

export interface SavedResearchSource extends ResearchSource {
  savedAt: string;
  tags?: string[];
  notes?: string;
}
