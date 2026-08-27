import {
  Calculator,
  Microscope,
  Landmark,
  Zap,
  FlaskConical,
  BookOpen,
  Cpu,
  LineChart,
  Briefcase,
  Wallet,
  HeartPulse,
  Globe,
  Wrench,
  Stethoscope,
  Languages
} from "lucide-react";
export type SubjectId =
  | "math"
  | "biology"
  | "history"
  | "physics"
  | "chemistry"
  | "english"
  | "computing"
  | "economics"
  | "business"
  | "commerce"
  | "pdhpe"
  | "geography"
  | "engineering"
  | "medicine"
  | "languages";

type GradeBand = "junior" | "middle" | "senior";

/**
 * Each subject gets a fixed, distinct colour used consistently everywhere a
 * subject appears - flashcards, quiz, calendar chips, document headers, the
 * subjects list. This is the app's real wayfinding system: colour encodes
 * "which subject", not decoration. Hues are deliberately spread around the
 * wheel and ordered so that subjects adjacent in the catalog (and therefore
 * in most list/grid UIs) never land on similar hues. Kept separate from the
 * personalised theme accent (--primary) so a subject's identity doesn't
 * shift when a student changes their app theme.
 */
export const SUBJECT_CATALOG: Array<{
  id: SubjectId;
  label: string;
  icon: typeof Calculator;
  iconName: string;
  color: string;
  descriptions: Record<GradeBand, string>;
}> = [
  {
    id: "math",
    label: "Mathematics",
    icon: Calculator,
    iconName: "Calculator",
    color: "#DC2626",
    descriptions: {
      junior: "NUMBERS, ALGEBRA, GEOMETRY",
      middle: "FUNCTIONS, GRAPHS, PROOFS",
      senior: "CALCULUS, STATISTICS, MODELS"
    }
  },
  {
    id: "biology",
    label: "Biology",
    icon: Microscope,
    iconName: "Microscope",
    color: "#16A34A",
    descriptions: {
      junior: "LIFE, CELLS, NATURE",
      middle: "SYSTEMS, GENETICS, EVOLUTION",
      senior: "PHYSIOLOGY, ECOLOGY, DNA"
    }
  },
  {
    id: "history",
    label: "History",
    icon: Landmark,
    iconName: "Landmark",
    color: "#E11D48",
    descriptions: {
      junior: "PAST EVENTS, CULTURES",
      middle: "CONFLICTS, IDEAS, CIVILISATIONS",
      senior: "POWER, CHANGE, INTERPRETATIONS"
    }
  },
  {
    id: "physics",
    label: "Physics",
    icon: Zap,
    iconName: "Zap",
    color: "#0891B2",
    descriptions: {
      junior: "MATTER, ENERGY, FORCES",
      middle: "MOTION, WAVES, ELECTRICITY",
      senior: "FIELDS, MODERN PHYSICS, MODELS"
    }
  },
  {
    id: "chemistry",
    label: "Chemistry",
    icon: FlaskConical,
    iconName: "FlaskConical",
    color: "#DB2777",
    descriptions: {
      junior: "ELEMENTS, REACTIONS",
      middle: "BONDS, RATES, ENERGY",
      senior: "EQUILIBRIA, ORGANIC, ANALYSIS"
    }
  },
  {
    id: "english",
    label: "English",
    icon: BookOpen,
    iconName: "BookOpen",
    color: "#0D9488",
    descriptions: {
      junior: "READING, WRITING, SPEAKING",
      middle: "LITERATURE, LANGUAGE, CULTURE",
      senior: "CRITICISM, ANALYSIS, CREATIVITY"
    }
  },
  {
    id: "computing",
    label: "Computing",
    icon: Cpu,
    iconName: "Cpu",
    color: "#C026D3",
    descriptions: {
      junior: "CODING, HARDWARE, SOFTWARE",
      middle: "ALGORITHMS, DATA, SYSTEMS",
      senior: "ARCHITECTURE, NETWORKS, AI"
    }
  },
  {
    id: "economics",
    label: "Economics",
    icon: LineChart,
    iconName: "LineChart",
    color: "#059669",
    descriptions: {
      junior: "SUPPLY, DEMAND, MARKETS",
      middle: "POLICIES, INCENTIVES, TRADE",
      senior: "MACRO, MICRO, MODELS"
    }
  },
  {
    id: "business",
    label: "Business Studies",
    icon: Briefcase,
    iconName: "Briefcase",
    color: "#9333EA",
    descriptions: {
      junior: "MANAGEMENT, STRATEGY, STARTUPS",
      middle: "MARKETING, FINANCE, OPERATIONS",
      senior: "LEADERSHIP, ANALYSIS, GROWTH"
    }
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: Wallet,
    iconName: "Wallet",
    color: "#0284C7",
    descriptions: {
      junior: "TRADE, FINANCE, ACCOUNTING",
      middle: "ENTREPRENEURSHIP, LAW, MONEY",
      senior: "INVESTING, RISK, ENTERPRISE"
    }
  },
  {
    id: "pdhpe",
    label: "PDHPE",
    icon: HeartPulse,
    iconName: "HeartPulse",
    color: "#7C3AED",
    descriptions: {
      junior: "HEALTH, FITNESS, WELL-BEING",
      middle: "SPORT, NUTRITION, MINDSET",
      senior: "PERFORMANCE, RECOVERY, HEALTH"
    }
  },
  {
    id: "geography",
    label: "Geography",
    icon: Globe,
    iconName: "Globe",
    color: "#D97706",
    descriptions: {
      junior: "WORLD, MAPS, ENVIRONMENT",
      middle: "POPULATION, CLIMATE, CITIES",
      senior: "HUMANS, HAZARDS, SYSTEMS"
    }
  },
  {
    id: "engineering",
    label: "Engineering",
    icon: Wrench,
    iconName: "Wrench",
    color: "#4F46E5",
    descriptions: {
      junior: "DESIGN, MECHANICS, BUILD",
      middle: "STRUCTURES, MATERIALS, SYSTEMS",
      senior: "MECHANICS, THERMODYNAMICS, DESIGN"
    }
  },
  {
    id: "medicine",
    label: "Medicine",
    icon: Stethoscope,
    iconName: "Stethoscope",
    color: "#EA580C",
    descriptions: {
      junior: "HEALTH, ANATOMY, DISEASE",
      middle: "ORGANS, TREATMENTS, PATHOLOGY",
      senior: "PHYSIOLOGY, PHARMACOLOGY, DIAGNOSIS"
    }
  },
  {
    id: "languages",
    label: "Languages",
    icon: Languages,
    iconName: "Languages",
    color: "#2563EB",
    descriptions: {
      junior: "VOCAB, GRAMMAR, SPEAKING",
      middle: "LITERATURE, CULTURE, WRITING",
      senior: "LINGUISTICS, LITERATURE, FLUENCY"
    }
  }
];

/** Hex -> "r, g, b" (for rgba() strings). */
const hexToRgbTriplet = (hex: string): string => {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

/** The fixed colour for a subject, or a neutral grey fallback for unknown ids. */
export const getSubjectColor = (id: string): string =>
  SUBJECT_CATALOG.find((s) => s.id === id)?.color || "#71717A";

/** Subject colour at a given opacity, e.g. for tinted backgrounds/borders. */
export const getSubjectColorAlpha = (id: string, alpha: number): string =>
  `rgba(${hexToRgbTriplet(getSubjectColor(id))}, ${alpha})`;

export const getGradeBand = (grade?: string | null): GradeBand => {
  const g = Number(grade);
  if (!Number.isFinite(g)) return "junior";
  if (g <= 8) return "junior";
  if (g <= 10) return "middle";
  return "senior";
};

export const getSubjectDescription = (id: SubjectId, grade?: string | null) => {
  const band = getGradeBand(grade);
  const subject = SUBJECT_CATALOG.find((s) => s.id === id);
  return subject?.descriptions[band] || "";
};
