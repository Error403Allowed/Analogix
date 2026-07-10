import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { FileChip } from "./FileChip";
import { formatTime } from "../utils/formatTime";

export function UserMessage({ content, createdAt }: { content: string; createdAt?: string }) {
  const theme = useTheme();
  const attachMatch = content.match(/^\[Attached files\]([\s\S]*?)\n\n\[File contents\][\s\S]*/);
  const userMsg = attachMatch
    ? content.replace(/^\[Attached files\][\s\S]*?\[File contents\][\s\S]*/, "").trim()
    : content;
  const fileNames = attachMatch
    ? content.match(/^\[Attached files\]\n((?:- .+\n?)*)/)?.[1]
        ?.split("\n")
        .map((l: string) => l.replace(/^- /, "").trim())
        .filter(Boolean) ?? []
    : [];

  return (
    <View style={[styles.row, styles.rowUser]}>
      <View style={{ maxWidth: "78%" }}>
        {fileNames.length > 0 && (
          <View style={[styles.fileRow, { justifyContent: "flex-end" }]}>
            {fileNames.map((name: string, i: number) => (
              <FileChip key={i} name={name} />
            ))}
          </View>
        )}
        <View style={[styles.bubble, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: theme.colors.onPrimary, fontSize: 15, lineHeight: 21 }}>
            {userMsg}
          </Text>
        </View>
        {createdAt && (
          <Text style={[styles.timestamp, styles.timestampRight, { color: theme.colors.onSurfaceVariant }]}>
            {formatTime(createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 16,
  },
  rowUser: {
    justifyContent: "flex-end",
    paddingRight: 12,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 6,
  },
  fileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  timestampRight: {
    textAlign: "right",
  },
});
