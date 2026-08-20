/**
 * UI message part-type filtering shared by the chat route.
 *
 * convertToModelMessages throws "Unsupported part" for UI part types it does not
 * recognise (e.g. legacy `tool-invocation`, `thinking`, `sources`, or
 * `source-url`/`source-document` research citations). Persisted sessions from
 * older SDK versions can contain those, so they must be dropped before
 * budgeting + conversion.
 *
 * Crucially the real v6 tool parts - typed `tool-<toolName>` (static) or
 * `dynamic-tool` - MUST be kept: the client's Allow/Deny approval response lives
 * on one of them, and stripping it means the server never sees the approval and
 * the model re-requests the same write-tool forever (the "it keeps asking"
 * loop). The one `tool-*` type that is still legacy is `tool-invocation` (the
 * v4 UI part shape) - it would be read as a bogus tool call and 500 the chat.
 */
const LEGACY_TOOL_PART_TYPES = new Set(["tool-invocation"]);

export const isSupportedPartType = (type: string): boolean =>
  type === "text" ||
  type === "file" ||
  type === "reasoning" ||
  type === "step-start" ||
  type.startsWith("data-") ||
  type === "dynamic-tool" ||
  (type.startsWith("tool-") && !LEGACY_TOOL_PART_TYPES.has(type));

export const sanitizeParts = (parts: unknown): unknown[] => {
  if (!Array.isArray(parts)) return [];
  return (parts as Array<{ type?: unknown }>).filter(
    (p) => p && typeof p === "object" && isSupportedPartType(String(p.type)),
  );
};