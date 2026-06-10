export interface SubjectEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SUBJECT_CATALOG: SubjectEntry[] = [
  { id: "math",        label: "Mathematics",       icon: "math-integral",     description: "Numbers, algebra, geometry, statistics, and calculus" },
  { id: "biology",     label: "Biology",            icon: "leaf",              description: "Living organisms, cells, genetics, and ecosystems" },
  { id: "history",     label: "History",            icon: "castle",            description: "Ancient, modern, Australian and world history" },
  { id: "physics",     label: "Physics",             icon: "lightning-bolt",   description: "Motion, energy, waves, electromagnetism, and quantum" },
  { id: "chemistry",   label: "Chemistry",           icon: "flask",            description: "Atoms, bonding, reactions, and organic chemistry" },
  { id: "english",     label: "English",             icon: "book-open-variant", description: "Reading, writing, analysis, and creative expression" },
  { id: "computing",   label: "Computing",           icon: "code-tags",        description: "Programming, algorithms, data structures, and AI" },
  { id: "economics",   label: "Economics",           icon: "chart-line",       description: "Markets, trade, fiscal policy, and economic theory" },
  { id: "business",    label: "Business Studies",    icon: "briefcase",        description: "Management, finance, marketing, and entrepreneurship" },
  { id: "commerce",    label: "Commerce",            icon: "wallet",           description: "Consumer, legal, and financial decision-making" },
  { id: "pdhpe",       label: "PDHPE",               icon: "heart-pulse",      description: "Health, physical activity, and personal development" },
  { id: "geography",   label: "Geography",           icon: "earth",            description: "Physical and human geography, sustainability" },
  { id: "engineering", label: "Engineering",         icon: "wrench",           description: "Design, materials, mechanics, and systems" },
  { id: "medicine",    label: "Medicine",            icon: "stethoscope",      description: "Human health, disease, treatment, and pharmacology" },
  { id: "languages",   label: "Languages",           icon: "translate",        description: "Foreign language acquisition and cultural study" },
];

export const SUBJECT_ID_TO_LABEL: Record<string, string> = Object.fromEntries(
  SUBJECT_CATALOG.map((s) => [s.id, s.label])
);

export const SUBJECT_LABEL_TO_ID: Record<string, string> = Object.fromEntries(
  SUBJECT_CATALOG.map((s) => [s.label.toLowerCase(), s.id])
);

export function getSubjectId(labelOrId: string): string {
  const lower = labelOrId.toLowerCase();
  return SUBJECT_LABEL_TO_ID[lower] ?? lower.replace(/\s+/g, "-");
}

export function getSubjectLabel(id: string): string {
  return SUBJECT_ID_TO_LABEL[id] ?? id;
}
