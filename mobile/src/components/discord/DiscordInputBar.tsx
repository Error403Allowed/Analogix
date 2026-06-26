import React from "react";
import { View, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme, ActivityIndicator } from "react-native-paper";
import Icon from "../Icon";
import { SHAPE } from "../../theme/tokens";
import { SPACE } from "../../theme/spacing";
import type { DiscordInputBarProps } from "./types";

export default function DiscordInputBar({
  value,
  onChangeText,
  placeholder = "Message",
  onSubmit,
  disabled,
  loading,
  left,
  multiline = true,
  maxLength = 4000,
}: DiscordInputBarProps) {
  const theme = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.elevation.level5,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      {left && <View style={styles.left}>{left}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant + "99"}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles.input,
          {
            color: theme.colors.onSurface,
            backgroundColor: "transparent",
          },
        ]}
      />
      <Pressable
        onPress={onSubmit}
        disabled={!canSend || loading}
        style={({ pressed }) => [
          styles.sendBtn,
          {
            backgroundColor: canSend && !loading
              ? theme.colors.primary
              : theme.colors.surfaceVariant,
          },
          pressed && canSend && { opacity: 0.7 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size={14} color="#fff" />
        ) : (
          <Icon
            name="send"
            size={16}
            color={canSend ? "#fff" : theme.colors.onSurfaceVariant}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 4,
    marginHorizontal: SPACE.lg,
    marginBottom: Platform.OS === "ios" ? 12 : 8,
  },
  left: {
    justifyContent: "center",
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxHeight: 100,
    minHeight: 36,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
