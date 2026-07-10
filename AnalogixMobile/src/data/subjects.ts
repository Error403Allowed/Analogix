export interface SubjectEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SUBJECT_CATALOG: SubjectEntry[] = [
  { id: "math",        label: "Mathematics",       icon: "math-integral",    description: "Numbers, algebra, geometry, statistics, and calculus" },
  { id: "biology",     label: "Biology",            icon: "leaf",             description: "Living organisms, cells, genetics, and ecosystems" },
  { id: "history",     label: "History",            icon: "castle",           description: "Ancient, modern, Australian and world history" },
  { id: "physics",     label: "Physics",             icon: "lightning-bolt",  description: "Motion, energy, waves, electromagnetism, and quantum" },
  { id: "chemistry",   label: "Chemistry",           icon: "flask",           description: "Atoms, bonding, reactions, and organic chemistry" },
  { id: "english",     label: "English",             icon: "book-open-variant", description: "Reading, writing, analysis, and creative expression" },
  { id: "computing",   label: "Computing",           icon: "code-tags",       description: "Programming, algorithms, data structures, and AI" },
  { id: "economics",   label: "Economics",           icon: "chart-line",      description: "Markets, trade, fiscal policy, and economic theory" },
  { id: "business",    label: "Business Studies",    icon: "briefcase",       description: "Management, finance, marketing, and entrepreneurship" },
  { id: "commerce",    label: "Commerce",            icon: "wallet",          description: "Consumer, legal, and financial decision-making" },
  { id: "pdhpe",       label: "PDHPE",               icon: "heart-pulse",     description: "Health, physical activity, and personal development" },
  { id: "geography",   label: "Geography",           icon: "earth",           description: "Physical and human geography, sustainability" },
  { id: "engineering", label: "Engineering",         icon: "wrench",          description: "Design, materials, mechanics, and systems" },
  { id: "medicine",    label: "Medicine",            icon: "stethoscope",     description: "Human health, disease, treatment, and pharmacology" },
  { id: "languages",   label: "Languages",           icon: "translate",       description: "Foreign language acquisition and cultural study" },
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

export const LUCIDE_TO_MDI: Record<string, string> = {
  Calculator: "calculator",
  Microscope: "microscope",
  FlaskConical: "flask-round-bottom",
  Atom: "atom",
  BookOpen: "book-open-variant",
  Code2: "code-tags",
  LineChart: "chart-line",
  Briefcase: "briefcase",
  Wallet: "wallet",
  HeartPulse: "heart-pulse",
  Globe: "earth",
  Wrench: "wrench",
  Stethoscope: "stethoscope",
  Languages: "translate",
  Music: "music",
  Palette: "palette",
  Trophy: "trophy",
  Star: "star",
  Heart: "heart",
  Flame: "fire",
  Lightbulb: "lightbulb",
  Rocket: "rocket",
  Target: "target",
  Award: "trophy",
  Bookmark: "bookmark",
  Calendar: "calendar",
  CheckCircle: "check-circle",
  Clock: "clock",
  Compass: "compass",
  Diamond: "diamond",
  Eye: "eye",
  FileText: "file-text",
  Folder: "folder",
  Gift: "gift",
  GraduationCap: "school",
  Home: "home",
  Key: "key",
  Lock: "lock",
  Mail: "mail",
  MapPin: "map-marker",
  Megaphone: "bullhorn",
  MessageCircle: "message-text",
  Moon: "weather-night",
  Paperclip: "paperclip",
  PenTool: "pen",
  Pencil: "pencil",
  Phone: "phone",
  PieChart: "chart-pie",
  Pin: "pin",
  Play: "play",
  Plus: "plus",
  Power: "power",
  Printer: "printer",
  Puzzle: "puzzle",
  RefreshCw: "refresh",
  Save: "content-save",
  Search: "magnify",
  Send: "send",
  Settings: "cog",
  Share: "share-variant",
  Shield: "shield",
  ShoppingBag: "shopping",
  Smile: "emoticon-happy",
  Snowflake: "snowflake",
  Sparkles: "auto-fix",
  Speaker: "speaker",
  Sun: "weather-sunny",
  Tag: "tag",
  ThumbsUp: "thumb-up",
  Tool: "tools",
  Truck: "truck",
  Tv: "television",
  Umbrella: "umbrella",
  User: "account",
  Users: "account-group",
  Video: "video",
  Volume2: "volume-high",
  Watch: "watch",
  Wifi: "wifi",
  Zap: "lightning-bolt",
  Cpu: "cpu",
  Brain: "brain",
  Landmark: "bank",
};

export function mapSubjectIcon(iconName: string | null | undefined): string {
  if (!iconName) return "book-open-variant";
  return LUCIDE_TO_MDI[iconName] ?? iconName;
}
