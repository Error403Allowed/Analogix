import { CUSTOM_TYPES_KEY, DELETED_BUILTIN_TYPES_KEY, BUILTIN_OVERRIDES_KEY, BUILTIN_TYPES } from "./constants";
import type { CustomEventType, BuiltinOverrides, TypeMeta } from "./types";

export function loadCustomTypes(): CustomEventType[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_TYPES_KEY) || "[]"); } catch { return []; }
}

export function saveCustomTypes(types: CustomEventType[]) {
  localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(types));
}

export function loadDeletedBuiltins(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DELETED_BUILTIN_TYPES_KEY) || "[]"); } catch { return []; }
}

export function saveDeletedBuiltins(keys: string[]) {
  localStorage.setItem(DELETED_BUILTIN_TYPES_KEY, JSON.stringify(keys));
}

export function loadBuiltinOverrides(): BuiltinOverrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BUILTIN_OVERRIDES_KEY) || "{}");
  } catch { return {}; }
}

export function saveBuiltinOverrides(overrides: BuiltinOverrides) {
  localStorage.setItem(BUILTIN_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function normalizeTagKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCustomTypeCandidate(
  label: string,
  icon: string,
  color: string,
  existingTypes: Record<string, TypeMeta>,
): { customType?: CustomEventType; error?: string } {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { error: "Enter a tag name" };

  const key = normalizeTagKey(trimmedLabel);
  if (!key) return { error: "Use letters or numbers in the tag name" };
  if (existingTypes[key]) return { error: "That tag already exists" };

  const labelTaken = Object.values(existingTypes).some(
    (type) => type.label.trim().toLowerCase() === trimmedLabel.toLowerCase(),
  );
  if (labelTaken) return { error: "That tag name already exists" };

  return {
    customType: {
      key,
      label: trimmedLabel,
      icon,
      color,
    },
  };
}

export function getAllTypes(
  customTypes: CustomEventType[],
  deletedBuiltins: string[],
  builtinOverrides: BuiltinOverrides,
): Record<string, TypeMeta> {
  const result: Record<string, TypeMeta> = {};
  for (const [k, v] of Object.entries(BUILTIN_TYPES)) {
    if (!deletedBuiltins.includes(k)) result[k] = { ...v, ...builtinOverrides[k] };
  }
  for (const t of customTypes) result[t.key] = { color: t.color, label: t.label, icon: t.icon };
  return result;
}

export function getTypeMeta(type: string, allTypes: Record<string, { color: string; label: string; icon: string }>) {
  return allTypes[type] ?? { color: "#3b82f6", label: type || "Event", icon: "📌" };
}
