/**
 * alpha - safely apply opacity to any hex colour.
 *
 * Handles 3‑, 4‑, 6‑ and 8‑digit hex strings and returns
 * an `rgba()` string.  Throws on obviously invalid input.
 *
 * Examples
 *   alpha("#2563EB", 0.10)  → "rgba(37,99,235,0.10)"
 *   alpha("primary", 0.10)  → "rgba(37,99,235,0.10)"  (if primary = #2563EB)
 *   alpha("#38BDF8", 0.5)   → "rgba(56,189,248,0.50)"
 *   alpha("#000", 0.8)      → "rgba(0,0,0,0.80)"
 */

const HEX_SHORTHAND = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const HEX_FULL = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export function alpha(hex: string, opacity: number): string {
  const clean = hex.replace(/[^a-f\d]/gi, "");
  const normalized = clean.length === 3 ? clean.replace(HEX_SHORTHAND, (_m, r, g, b) => r + r + g + g + b + b) : clean;
  const match = normalized.match(HEX_FULL);
  if (!match) {
    return hex;
  }
  const r = Number.parseInt(match[1]!, 16);
  const g = Number.parseInt(match[2]!, 16);
  const b = Number.parseInt(match[3]!, 16);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}
