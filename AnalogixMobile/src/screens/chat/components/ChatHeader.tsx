import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../../components/Icon";

export function ChatHeader({ navigation, currentSubject, onSubjectPress, onNewSession }: {
  navigation: any;
  currentSubject?: { id: string; name: string; icon: string } | null;
  onSubjectPress: () => void;
  onNewSession: () => void;
}) {
  const insets = useSafeAreaInsets();
  const paperTheme = useTheme();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: paperTheme.colors.surface }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
        <Icon name="chevron-left" size={22} color={paperTheme.colors.onSurface} />
      </Pressable>

      <Pressable onPress={onSubjectPress} style={styles.subjectPill}>
        <Text style={{ fontSize: 12 }}>{currentSubject?.icon ?? "📚"}</Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: paperTheme.colors.onSurface, marginLeft: 4 }}>
          {currentSubject?.name ?? "General"}
        </Text>
        <Icon name="chevron-down" size={14} color={paperTheme.colors.onSurfaceVariant} />
      </Pressable>

      <View style={{ flex: 1 }} />

      <Pressable onPress={onNewSession} style={styles.headerBtn}>
        <Icon name="plus" size={20} color={paperTheme.colors.onSurface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center",
  },
  subjectPill: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#f0f0f0", marginLeft: 4,
  },
});
