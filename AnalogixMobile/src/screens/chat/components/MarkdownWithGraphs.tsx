import React, { useMemo } from "react";
import { View } from "react-native";
import { MarkdownRenderer } from "../../../components/MarkdownRenderer";
import { GraphPlotter } from "../../../components/GraphPlotter";
import { desmosBlocks } from "../utils/desmosBlocks";

export function MarkdownWithGraphs({ content, onRunCode }: { content: string; onRunCode?: (code: string) => void }) {
  const blocks = useMemo(() => desmosBlocks(content), [content]);
  return (
    <View>
      {blocks.map((block, i) =>
        block.expressions.length > 0 ? (
          <GraphPlotter key={`g-${i}`} expressions={block.expressions} height={250} />
        ) : (
          block.text ? <MarkdownRenderer key={`m-${i}`} content={block.text} onRunCode={onRunCode} /> : null
        )
      )}
    </View>
  );
}
