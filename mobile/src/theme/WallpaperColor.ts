export const DYNAMIC_SEED_COLORS = [
  { name: "Indigo", hex: "#6750A4" },
  { name: "Blue", hex: "#1B6EF3" },
  { name: "Sky", hex: "#0094D9" },
  { name: "Teal", hex: "#00897B" },
  { name: "Green", hex: "#2E7D32" },
  { name: "Lime", hex: "#66BB6A" },
  { name: "Yellow", hex: "#F9A825" },
  { name: "Orange", hex: "#EF6C00" },
  { name: "Red", hex: "#D32F2F" },
  { name: "Pink", hex: "#E91E8C" },
  { name: "Purple", hex: "#9C27B0" },
  { name: "Coral", hex: "#FF6B6B" },
] as const;

export function isDynamicColorSupported(): boolean {
  return true;
}

export async function getWallpaperSeedColor(): Promise<string | null> {
  return null;
}
