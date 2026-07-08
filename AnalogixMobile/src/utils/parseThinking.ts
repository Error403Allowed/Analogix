export function parseThinking(content: string): { thinking: string | null; response: string } {
  const trimmed = content.trimStart();
  const completeMatch = trimmed.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (completeMatch) {
    const response = trimmed.slice(completeMatch[0].length).trim();
    if (!response) {
      return { thinking: completeMatch[1].trim(), response: "" };
    }
    return { thinking: completeMatch[1].trim(), response };
  }
  const openOnly = trimmed.match(/^<think>([\s\S]*)$/);
  if (openOnly) {
    return { thinking: openOnly[1].trim(), response: "" };
  }
  return { thinking: null, response: content };
}
