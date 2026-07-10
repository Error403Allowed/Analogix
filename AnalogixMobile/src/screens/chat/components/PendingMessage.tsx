import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

export function PendingMessage({ content }: { content: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, styles.rowUser]}>
      <View style={{ maxWidth: "78%" }}>
        <View style={[styles.bubble, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: theme.colors.onPrimary, fontSize: 15, lineHeight: 21 }}>
            {content}
          </Text>
        </View>
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
});
