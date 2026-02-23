import pdfParse from "pdf-parse";
import type { AustralianState } from "@/utils/termData";
import { getGradeBand, type SubjectId } from "@/constants/subjects";

export type PastPaperSnippet = {
  sourceId: string;
  sourceLabel: string;
  url: string;
  text: string;
};

type GradeBand = ReturnType<typeof getGradeBand>;

type SourceType = "html" | "pdf";

type PastPaperSource = {
  id: string;
  label: string;
  url: string;
  type: SourceType;
  states: AustralianState[] | "ALL";
  grades?: GradeBand[] | "ALL";
  subjects?: SubjectId[] | "ALL";
  maxLinks?: number;
};

const SOURCE_LIST: PastPaperSource[] = [
  {
    id: "naplan-2008-2011",
    label: "NAPLAN 2008-2011 Test Papers (ACARA)",
    url: "https://www.acara.edu.au/assessment/naplan/naplan-2008-2011-test-papers",
    type: "html",
    states: "ALL",
    grades: ["junior", "middle"],
  },
  {
    id: "naplan-2012-2016",
    label: "NAPLAN 2012-2016 Test Papers (ACARA)",
    url: "https://www.acara.edu.au/assessment/naplan/naplan-2012-2016-test-papers",
    type: "html",
    states: "ALL",
    grades: ["junior", "middle"],
  },
  {
    id: "nsw-hsc-papers",
    label: "NSW HSC Exam Papers (NESA)",
    url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers",
    type: "html",
    states: ["NSW"],
    grades: ["senior"],
    maxLinks: 1,
  },
  {
    id: "vic-vce-past-exams",
    label: "VCE Past Examinations (VCAA)",
    url: "https://www.vcaa.vic.edu.au/assessment/vce-assessment/past-examinations/Pages/index.aspx",
    type: "html",
    states: ["VIC"],
    grades: ["senior"],
    maxLinks: 1,
  },
  {
    id: "qld-external-assessment",
    label: "QLD External Assessment (QCAA)",
    url: "https://myqce.qcaa.qld.edu.au/assessment-and-results/external-assessment",
    type: "html",
    states: ["QLD"],
    grades: ["senior"],
    maxLinks: 1,
  },
  {
    id: "sa-sace-external",
    label: "SACE External Assessment (SA / NT)",
    url: "https://www.sace.sa.edu.au/teaching/assessment/external-assessment",
    type: "html",
    states: ["SA", "NT"],
    grades: ["senior"],
    maxLinks: 1,
  },
  {
    id: "wa-scsa-past-atar",
    label: "WA Past ATAR Course Exams (SCSA)",
    url: "https://www.scsa.wa.edu.au/publications/past-atar-course-exams",
    type: "html",
    states: ["WA"],
    grades: ["senior"],
    maxLinks: 1,
  },
  {
    id: "tas-tasc-past-exams",
    label: "TAS Previous Exam Papers (TASC)",
    url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/",
    type: "html",
    states: ["TAS"],
    grades: ["senior"],
    maxLinks: 1,
  },
];

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

const textCache = new Map<string, { fetchedAt: number; text: string }>();
const htmlCache = new Map<string, { fetchedAt: number; html: string }>();

const withTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AnalogixBot/1.0",
        "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.8",
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const decodeEntities = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripHtml = (html: string) => {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const stripped = noStyles.replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
};

const extractPdfLinks = (html: string, baseUrl: string) => {
  const links: string[] = [];
  const regex = /href=["']([^"']+\.pdf[^"']*)["']/gi;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl).toString();
      links.push(url);
    } catch {
      // ignore malformed urls
    }
  }
  return Array.from(new Set(links));
};

const extractSnippets = (text: string, limit: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const lineCandidates = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 40 && line.length <= 220);

  const questionLines = lineCandidates.filter((line) =>
    /\?$|question\s+\d+/i.test(line),
  );

  const sentenceCandidates = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 220);

  const pool = [...questionLines, ...sentenceCandidates];
  const unique: string[] = [];
  for (const item of pool) {
    const normalized = item.toLowerCase();
    if (unique.some((u) => u.toLowerCase() === normalized)) continue;
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique.slice(0, limit);
};

const fetchHtml = async (url: string) => {
  const cached = htmlCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.html;
  }

  const response = await withTimeout(url);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  const html = await response.text();
  htmlCache.set(url, { fetchedAt: Date.now(), html });
  return html;
};

const fetchText = async (url: string, type: SourceType) => {
  const cached = textCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.text;
  }

  let text = "";
  if (type === "pdf") {
    const response = await withTimeout(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_PDF_BYTES) {
      throw new Error("PDF too large");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_PDF_BYTES) {
      throw new Error("PDF too large");
    }
    const parsed = await pdfParse(buffer);
    text = parsed.text || "";
  } else {
    const html = await fetchHtml(url);
    text = stripHtml(html);
  }

  const compacted = text.replace(/\s+/g, " ").trim();
  textCache.set(url, { fetchedAt: Date.now(), text: compacted });
  return compacted;
};

const resolveSources = (state?: AustralianState | null, grade?: string | null, subject?: SubjectId) => {
  const gradeBand = getGradeBand(grade);

  return SOURCE_LIST.filter((source) => {
    const stateOk =
      source.states === "ALL" ||
      (state ? source.states.includes(state) : false);

    const gradeOk =
      !source.grades ||
      source.grades === "ALL" ||
      source.grades.includes(gradeBand);

    const subjectOk =
      !source.subjects ||
      source.subjects === "ALL" ||
      (subject ? source.subjects.includes(subject) : false);

    return stateOk && gradeOk && subjectOk;
  });
};

const collectSourceLinks = async (source: PastPaperSource) => {
  if (source.type === "pdf") return [source.url];

  const html = await fetchHtml(source.url);
  const links = extractPdfLinks(html, source.url);
  if (links.length === 0) return [source.url];
  return links.slice(0, source.maxLinks ?? 2);
};

export const getPastPaperSnippets = async (params: {
  state?: AustralianState | null;
  grade?: string | null;
  subject?: SubjectId;
  limit?: number;
}): Promise<PastPaperSnippet[]> => {
  const { state = null, grade = null, subject, limit = 6 } = params;
  if (!state) return [];

  const sources = resolveSources(state, grade, subject);
  const snippets: PastPaperSnippet[] = [];

  for (const source of sources) {
    if (snippets.length >= limit) break;
    try {
      const links = await collectSourceLinks(source);
      for (const link of links) {
        if (snippets.length >= limit) break;
        try {
          const type = link.toLowerCase().includes(".pdf") ? "pdf" : "html";
          const text = await fetchText(link, type);
          const picks = extractSnippets(text, Math.max(1, Math.ceil(limit / sources.length)));
          for (const pick of picks) {
            snippets.push({
              sourceId: source.id,
              sourceLabel: source.label,
              url: link,
              text: pick,
            });
            if (snippets.length >= limit) break;
          }
        } catch {
          // Skip individual link failures.
        }
      }
    } catch {
      // Skip sources that fail to load.
    }
  }

  return snippets.slice(0, limit);
};
