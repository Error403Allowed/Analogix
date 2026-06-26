import React, { useState, useEffect, useRef } from "react";
import {
  View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getSupabase } from "../../supabase";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { SHAPE } from "../../theme/tokens";
import type { RootStackParamList } from "../../navigation/types";

export default function ResetPasswordScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirmRef = useRef<any>(null);

  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardY.value = withSpring(0, { damping: 20, stiffness: 160, mass: 0.7 });
  }, [cardOpacity, cardY]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const isValid = password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Failed to update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.screen,
            { backgroundColor: paperTheme.colors.background },
          ]}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
                marginTop: insets.top + 40,
                marginBottom: Math.max(insets.bottom, 24) + 16,
              },
              cardAnim,
            ]}
          >
            {done ? (
              <View style={styles.doneBlock}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: "#22C55E" + "14" },
                  ]}
                >
                  <Text style={{ fontSize: 32, color: "#22C55E" }}>✓</Text>
                </View>
                <Text
                  variant="headlineSmall"
                  style={[styles.heading, { color: paperTheme.colors.onSurface }]}
                >
                  Password updated!
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: paperTheme.colors.onSurfaceVariant,
                    textAlign: "center",
                  }}
                >
                  Your password has been changed successfully.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => nav.reset({ index: 0, routes: [{ name: "Login" }] })}
                  buttonColor={paperTheme.colors.primary}
                  textColor={paperTheme.colors.onPrimary}
                  style={styles.btn}
                  contentStyle={styles.btnContent}
                >
                  Back to Login
                </Button>
              </View>
            ) : (
              <View style={styles.formSection}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: paperTheme.colors.primary + "14",
                      alignSelf: "center",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 28, color: paperTheme.colors.primary }}>
                    🔒
                  </Text>
                </View>

                <View style={styles.textGroup}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.heading, { color: paperTheme.colors.onSurface }]}
                  >
                    Create a new password
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: paperTheme.colors.onSurfaceVariant,
                      textAlign: "center",
                    }}
                  >
                    At least 6 characters — make it a good one!
                  </Text>
                </View>

                {error && (
                  <View
                    style={[
                      styles.errorBox,
                      { backgroundColor: paperTheme.colors.errorContainer },
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      style={{ color: paperTheme.colors.onErrorContainer }}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                <TextInput
                  mode="outlined"
                  label="New password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword((p) => !p)}
                    />
                  }
                />

                <TextInput
                  ref={confirmRef}
                  mode="outlined"
                  label="Confirm new password"
                  value={confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    setError(null);
                  }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => isValid && handleSubmit()}
                  outlineStyle={[
                    styles.inputOutline,
                    confirm && password !== confirm && {
                      borderColor: paperTheme.colors.error,
                    },
                  ]}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirm ? "eye-off" : "eye"}
                      onPress={() => setShowConfirm((p) => !p)}
                    />
                  }
                />

                {confirm && password !== confirm && (
                  <Text
                    variant="bodySmall"
                    style={{ color: paperTheme.colors.error, fontWeight: "500" }}
                  >
                    Passwords don&apos;t match
                  </Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!isValid || loading}
                  buttonColor={paperTheme.colors.primary}
                  textColor={paperTheme.colors.onPrimary}
                  contentStyle={styles.btnContent}
                  style={styles.btn}
                  labelStyle={styles.btnLabel}
                >
                  Update Password
                </Button>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: SHAPE.xxl + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 32,
    alignItems: "center",
    gap: 24,
  },
  formSection: {
    width: "100%",
    gap: 16,
  },
  doneBlock: {
    width: "100%",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  textGroup: {
    gap: 6,
    alignItems: "center",
  },
  heading: {
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    width: "100%",
    padding: 12,
    borderRadius: SHAPE.md,
  },
  input: {
    width: "100%",
    backgroundColor: "transparent",
  },
  inputOutline: {
    borderRadius: SHAPE.lg,
  },
  btn: {
    width: "100%",
    borderRadius: SHAPE.xl,
  },
  btnContent: {
    height: 52,
  },
  btnLabel: {
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
