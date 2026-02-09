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
  Globe
} from "lucide-react";

export type SubjectId =
  | "math"
  | "biology"
  | "history"
  | "physics"
  | "chemistry"
  | "literature"
  | "computing"
  | "economics"
  | "business"
  | "commerce"
  | "pdhpe"
  | "geography";

type GradeBand = "junior" | "middle" | "senior";

export const SUBJECT_CATALOG: Array<{
  id: SubjectId;
  label: string;
  icon: typeof Calculator;
  descriptions: Record<GradeBand, string>;
}> = [
  {
    id: "math",
    label: "Mathematics",
    icon: Calculator,
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
    descriptions: {
      junior: "ELEMENTS, REACTIONS",
      middle: "BONDS, RATES, ENERGY",
      senior: "EQUILIBRIA, ORGANIC, ANALYSIS"
    }
  },
  {
    id: "literature",
    label: "Literature",
    icon: BookOpen,
    descriptions: {
      junior: "BOOKS, POETRY, STORIES",
      middle: "THEMES, VOICE, CONTEXT",
      senior: "ANALYSIS, CRITIQUE, STYLE"
    }
  },
  {
    id: "computing",
    label: "Computing",
    icon: Cpu,
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
    descriptions: {
      junior: "WORLD, MAPS, ENVIRONMENT",
      middle: "POPULATION, CLIMATE, CITIES",
      senior: "HUMANS, HAZARDS, SYSTEMS"
    }
  }
];

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
