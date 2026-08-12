import type { TypeMeta } from "./types";

export const BUILTIN_TYPES: Record<string, TypeMeta> = {
  exam:       { color: "#ef4444", label: "Exam",       icon: "🎯" },
  assignment: { color: "#f59e0b", label: "Assignment",  icon: "📝" },
  event:      { color: "#3b82f6", label: "Event",       icon: "📌" },
  class:      { color: "#10b981", label: "Class",       icon: "🎓" },
  lesson:     { color: "#10b981", label: "Lesson",      icon: "📚" },
  reminder:   { color: "#8b5cf6", label: "Reminder",    icon: "🔔" },
  sport:      { color: "#f97316", label: "Sport",       icon: "⚽" },
  meeting:    { color: "#06b6d4", label: "Meeting",     icon: "👥" },
  personal:   { color: "#ec4899", label: "Personal",    icon: "🏠" },
};

export const CUSTOM_TYPES_KEY = "analogix_custom_event_types";
export const DELETED_BUILTIN_TYPES_KEY = "analogix_deleted_builtin_types";
export const BUILTIN_OVERRIDES_KEY = "analogix_builtin_overrides";
export const PRESET_COLORS = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16",
  "#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#6b7280",
];

export const EMOJI_OPTIONS = [
  "🎯","📝","📌","🎓","📚","🔔","⚽","👥","🏷️","🔥","⭐","💡",
  "🎵","🎨","🏋️","🍕","✈️","🏠","💻","📅","🧪","🔬","📊","💰",
  "🎮","📸","🚀","🌟","❤️","🎉","🏆","⚡",
  "🏊","🎸","🎤","🎬","🍔","☕","🍎","🧁","🎂","🛒","🚗","🚌",
  "🌈","🌸","🌻","🌍","🏖️","🏕️","⛷️","🤸","🧘","🏃","🚴","🤾",
  "📖","✏️","🖊️","📐","📏","🗒️","📋","📎","🗂️","📂","📁","🗃️",
  "💬","📞","📧","🔗","🔒","🔑","💼","👔","🎒","👟","🎀","🧩",
  "🌙","☀️","⛅","❄️","🌊","⛰️","🦁","🐶","🐱","🦋","🌺","🍀",
];

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const HOUR_H = 56;
