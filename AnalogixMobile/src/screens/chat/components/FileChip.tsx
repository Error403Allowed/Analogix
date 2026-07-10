import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Icon from "../../../components/Icon";

export function FileChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <View style={styles.fileChip}>
      <Icon name="description" size={14} color="#6366f1" />
      <Text style={styles.fileChipText} numberOfLines={1}>{name}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Icon name="close" size={14} color="#999" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f0ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  fileChipText: {
    fontSize: 12,
    color: "#333",
    maxWidth: 120,
  },
});
