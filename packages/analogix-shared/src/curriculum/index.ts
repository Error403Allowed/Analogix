import {
  type CurriculumSubject,
  type GradeCurriculum,
  type CurriculumStrand,
  type CurriculumTopic,
} from "./types.js";

export type {
  CurriculumSubject,
  GradeCurriculum,
  CurriculumStrand,
  CurriculumTopic,
};

export { AUSTRALIAN_STATES, GRADES, STATE_FULL_NAMES } from "../types/enums.js";
export type { AustralianState, Grade } from "../types/enums.js";

import { CURRICULUM_DATA } from "./data.js";

export { CURRICULUM_DATA };

export function getCurriculum(): CurriculumSubject[] {
  return CURRICULUM_DATA;
}

export { chunkCurriculum, chunkCurriculumWithElaborations } from "./chunker.js";
export type { ChunkedCurriculumEntry } from "./chunker.js";

export function buildFullCurriculumPrompt(subject: string, grade: number): string {
  const s = CURRICULUM_DATA.find(
    (s) => s.name.toLowerCase() === subject.toLowerCase() || s.id === subject
  );
  if (!s) return "";
  const g = s.grades.find((g) => g.grade === grade);
  if (!g) return "";
  const lines = [`Curriculum: ${s.name} (Grade ${grade})`];
  for (const strand of g.strands) {
    lines.push(`  ${strand.name}:`);
    for (const t of strand.topics) {
      lines.push(`    - ${t.name}: ${t.description}`);
    }
  }
  return lines.join("\n");
}

/** Builds a system-prompt block listing all valid curriculum subjects. */
export function buildValidSubjectsPrompt(): string {
  const subjects = CURRICULUM_DATA.map((s) => `  • ${s.name}`).join("\n");
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALID SUBJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following are the ONLY valid subjects. Do NOT create, reference, or suggest subjects outside this list:

${subjects}

If a user asks about a topic in a subject NOT in this list, explain that it's not part of the Australian curriculum and suggest the closest valid subject.
When calling tools, always use the subject ID that matches one of these valid subject names.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
