import { Mathematics } from "./acara/mathematics.js";
import { English } from "./acara/english.js";
import { Science } from "./acara/science.js";
import { HASS } from "./acara/hass.js";

export type { CurriculumTopic, CurriculumYearLevel, CurriculumSubject } from "./acara/types.js";

export const ACARA_CURRICULUM: Record<string, import("./acara/types.js").CurriculumSubject> = {
  ...Mathematics,
  ...English,
  ...Science,
  ...HASS,
};

export const ACARA_SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Digital Technologies",
  "HASS",
  "History",
  "Geography",
  "Economics",
  "Business",
  "Civics",
  "Physics",
  "Chemistry",
  "Biology",
  "Design and Technologies",
  "Visual Arts",
  "Music",
  "Health and Physical Education",
  "Languages",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Economics",
  "Business"
];

export const SENIOR_SUBJECTS = [
  { id: "mathematics_advanced", label: "Mathematics Advanced", years: [11, 12], states: ["NSW"] },
  { id: "mathematics_extension_1", label: "Mathematics Extension 1", years: [11, 12], states: ["NSW"] },
  { id: "mathematics_extension_2", label: "Mathematics Extension 2", years: [12], states: ["NSW"] },
  { id: "mathematical_methods", label: "Mathematical Methods", years: [11, 12], states: ["VIC", "QLD", "WA", "SA"] },
  { id: "specialist_mathematics", label: "Specialist Mathematics", years: [11, 12], states: ["VIC", "QLD", "WA", "SA"] },
  { id: "further_mathematics", label: "Further Mathematics", years: [12], states: ["VIC", "WA"] },
  { id: "english_advanced", label: "English Advanced", years: [11, 12], states: ["NSW"] },
  { id: "english_extension_1", label: "English Extension 1", years: [11, 12], states: ["NSW"] },
  { id: "english_extension_2", label: "English Extension 2", years: [12], states: ["NSW"] },
  { id: "english_standard", label: "English Standard", years: [11, 12], states: ["NSW"] },
  { id: "biology", label: "Biology", years: [11, 12], states: ["ALL"] },
  { id: "chemistry", label: "Chemistry", years: [11, 12], states: ["ALL"] },
  { id: "physics", label: "Physics", years: [11, 12], states: ["ALL"] },
  { id: "economics", label: "Economics", years: [11, 12], states: ["ALL"] },
  { id: "business_studies", label: "Business Studies", years: [11, 12], states: ["ALL"] },
  { id: "modern_history", label: "Modern History", years: [11, 12], states: ["ALL"] },
  { id: "geography", label: "Geography", years: [11, 12], states: ["ALL"] },
  { id: "pdhpe", label: "PDHPE", years: [11, 12], states: ["NSW"] },
  { id: "french", label: "French", years: [11, 12], states: ["ALL"] },
  { id: "japanese", label: "Japanese", years: [11, 12], states: ["ALL"] },
  { id: "mandarin", label: "Mandarin", years: [11, 12], states: ["ALL"] }
];

export const STATE_CURRICULUM_DOCUMENTS: Record<string, string> = {
  NSW: "NESA (New South Wales Education Standards Authority) - HSC and Stage 6 syllabi",
  VIC: "VCED (Victorian Curriculum and Assessment Authority) - VCE and Victorian Curriculum",
  QLD: "QCAA (Queensland Curriculum and Assessment Authority) - QCE and senior secondary syllabi",
  SA: "SACE (South Australian Certificate of Education) - SACE and South Australian Curriculum",
  WA: "SCSA (Schools Curriculum and Standards Authority) - WACE and Western Australian Curriculum",
  TAS: "TASC (Tasmanian Assessment, Standards and Certification) - TCE and Tasmanian Curriculum",
  NT: "DCM (Department of Education - Northern Territory) - NT curriculum",
  ACT: "BSSS (Board of Senior Secondary Studies) - ACT senior secondary curriculum"
};
