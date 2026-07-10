export function desmosBlocks(content: string): { text: string; expressions: string[] }[] {
  const parts = content.split(/(```desmos[\s\S]*?```)/);
  const blocks: { text: string; expressions: string[] }[] = [];
  for (const part of parts) {
    if (part.startsWith("```desmos")) {
      const inner = part.replace(/```desmos\n?/, "").replace(/```$/, "").trim();
      const exprs = inner.split("\n").filter(l => !l.trim().startsWith("[") && l.trim());
      if (exprs.length > 0) blocks.push({ text: "", expressions: exprs });
    } else if (part.trim()) {
      blocks.push({ text: part, expressions: [] });
    }
  }
  return blocks;
}
