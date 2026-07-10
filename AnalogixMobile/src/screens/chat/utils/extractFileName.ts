export function extractFileName(text: string): string | null {
  const match = text.match(/^\[File: (.+?)\]/);
  return match ? match[1] : null;
}
