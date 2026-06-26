export interface ParsedMessage {
  thinking: string | null;
  response: string;
}

export function parseThinkingBlock(content: string, isFinal: boolean): ParsedMessage {
  const trimmed = content.trim();

  const completeMatch = trimmed.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (completeMatch) {
    const response = trimmed.slice(completeMatch[0].length).trim();
    if (!response) {
      return {
        thinking: completeMatch[1].trim(),
        response: isFinal
          ? "*(The model did not return a response after thinking. Please try again.)*"
          : "",
      };
    }
    return { thinking: completeMatch[1].trim(), response };
  }

  const openOnly = trimmed.match(/^<think>([\s\S]*)$/);
  if (openOnly) {
    return {
      thinking: openOnly[1].trim(),
      response: isFinal
        ? "*(The model's reasoning was cut off. Please try again.)*"
        : "",
    };
  }

  return { thinking: null, response: content };
}
