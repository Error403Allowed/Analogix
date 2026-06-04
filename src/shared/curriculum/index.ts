import {
  type CurriculumSubject,
  type GradeCurriculum,
  type CurriculumStrand,
  type CurriculumTopic,
} from "./types";

export type {
  CurriculumSubject,
  GradeCurriculum,
  CurriculumStrand,
  CurriculumTopic,
};

export { AUSTRALIAN_STATES, GRADES, STATE_FULL_NAMES } from "../types/enums";
export type { AustralianState, Grade } from "../types/enums";

import { CURRICULUM_DATA } from "./data";

export { CURRICULUM_DATA };

export function getCurriculum(): CurriculumSubject[] {
  return CURRICULUM_DATA;
}

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
