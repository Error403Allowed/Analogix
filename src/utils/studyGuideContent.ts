import type { GeneratedStudyGuide } from "@/services/groq";

export const STUDY_GUIDE_V2_PREFIX = "__STUDY_GUIDE_V2__";

const LEGACY_PREFIXES = ["__STUDY_GUIDE_JSON__", "__STUDY_GUIDE_V1__"];

export const encodeStudyGuide = (guide: GeneratedStudyGuide): string =>
  STUDY_GUIDE_V2_PREFIX + JSON.stringify(guide);

export const decodeStudyGuide = (raw: string): GeneratedStudyGuide | null => {
  if (raw.startsWith(STUDY_GUIDE_V2_PREFIX)) {
    try {
      return JSON.parse(raw.slice(STUDY_GUIDE_V2_PREFIX.length));
    } catch {
      return null;
    }
  }

  for (const prefix of LEGACY_PREFIXES) {
    if (!raw.startsWith(prefix)) continue;

    try {
      const parsed = JSON.parse(raw.slice(prefix.length));
      return parsed.studyGuide ?? parsed;
    } catch {
      return null;
    }
  }

  return null;
};
