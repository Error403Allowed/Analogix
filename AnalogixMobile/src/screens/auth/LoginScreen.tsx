import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, StyleSheet, Platform, Image, useWindowDimensions,
  TextInput as RNTextInput, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { getSupabase } from "../../supabase";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { SHAPE } from "../../theme/tokens";
import { useThemeContext } from "../../theme/ThemeContext";
import type { RootStackParamList } from "../../navigation/types";

WebBrowser.maybeCompleteAuthSession();

function extractCodeFromUrl(url: string): string | null {
  try {
    const hashIndex = url.indexOf("#");
    const queryIndex = url.indexOf("?");
    const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
    const query = queryIndex >= 0 && (hashIndex < 0 || queryIndex < hashIndex)
      ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
      : "";
    for (const part of [...fragment.split("&"), ...query.split("&")]) {
      const [k, v] = part.split("=");
      if (k === "code" && v) return decodeURIComponent(v);
    }
  } catch {
    return null;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require("../../../assets/tab-icon.png");

function FloatingOrbs({ primary, secondary }: { primary: string; secondary: string }) {
  const { width: W, height: H } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, 16]) },
      { translateY: interpolate(t.value, [0, 1], [0, -12]) },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, -10]) },
      { translateY: interpolate(t.value, [0, 1], [0, 10]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { backgroundColor: primary, opacity: 0.07, width: 320, height: 320, top: -80, right: -60 },
          orb1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { backgroundColor: secondary, opacity: 0.07, width: 260, height: 260, bottom: -50, left: -60 },
          orb2Style,
        ]}
      />
    </View>
  );
}

function getEmailError(code: string | null, message: string | null): string {
  const c = (code || "").toLowerCase();
  const m = (message || "").toLowerCase();
  if (c === "invalid_credentials" || c === "wrong_password" || m.includes("invalid login credentials")) {
    return "Invalid email of password. Maybe you signed in using google?.";
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Please confirm your email first — check your inbox.";
  }
  if (c === "user_not_found" || m.includes("user not found")) {
    return "No account found with this email.";
  }
  if (c === "weak_password" || m.includes("weak password") || m.includes("password should be at least 6")) {
    return "Password must be at least 6 characters.";
  }
  if (c === "email_exists" || m.includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  if (c === "rate_limit" || m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (message) return message;
  return "Something went wrong. Please try again.";
}

export default function LoginScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email/password state
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const cardY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0.9);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    cardY.value = withSpring(0, { damping: 20, stiffness: 160, mass: 0.7 });
    cardOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    btnScale.value = withDelay(350, withSpring(1, { damping: 16, stiffness: 140 }));
    btnOpacity.value = withDelay(350, withTiming(1, { duration: 350 }));
  }, [cardY, cardOpacity, btnScale, btnOpacity]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ scale: btnScale.value }],
  }));

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const emailOk = isValidEmail(email);
  const pwOk = password.length >= 6;
  const matchOk = mode === "signin" || password === confirmPassword;
  const canSubmit = emailOk && pwOk && matchOk && !submitting;

  // ── Google sign-in ───────────────────────────────────────────────────
  const handleGoogle = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const supabase = getSupabase();

      if (Platform.OS !== "web") {
        const redirectTo = makeRedirectUri({ scheme: "analogix", path: "auth/callback" });
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === "success" && result.url) {
            const code = extractCodeFromUrl(result.url);
            if (code) {
              const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeErr) throw exchangeErr;
            } else {
              await supabase.auth.getSession();
            }
          } else {
            setBusy(false);
          }
        }
      } else {
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (oauthErr) throw oauthErr;
        if (data?.url) window.location.href = data.url;
      }
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Failed to start sign-in");
    }
  }, []);

  // ── Email/password submit ────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const supabase = getSupabase();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "analogix://auth/callback",
          },
        });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try signing in.");
        } else {
          setSuccessMsg("Check your email for a confirmation link!");
        }
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(getEmailError(err.code ?? null, err.message ?? null));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, mode, email, password]);

  // ── Forgot password ──────────────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgot = useCallback(async () => {
    if (!isValidEmail(forgotEmail)) return;
    setForgotLoading(true);
    setError(null);
    const supabase = getSupabase();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: "analogix://auth/reset-password",
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(getEmailError(err.code ?? null, err.message ?? null));
    } finally {
      setForgotLoading(false);
    }
  }, [forgotEmail]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.screen, { backgroundColor: paperTheme.colors.background }]}>
          <FloatingOrbs primary={brand.primary} secondary={brand.secondary} />

          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
                marginTop: insets.top,
                marginBottom: Math.max(insets.bottom, 24) + 16,
              },
              cardAnimStyle,
            ]}
          >
            <View style={styles.logoContainer}>
              <View style={[styles.logoOuter, { borderColor: brand.primary + "20" }]}>
                <View style={[styles.logoBg, { backgroundColor: brand.primary + "14" }]}>
                  <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
                </View>
              </View>
            </View>

            {showForgot ? (
              <View style={styles.formSection}>
                <View style={styles.textGroup}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.heading, { color: paperTheme.colors.onSurface }]}
                  >
                    {forgotSent ? "Check your email" : "Reset your password"}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}
                  >
                    {forgotSent
                      ? "We've sent a reset link to your email."
                      : "Enter your email and we'll send you a reset link."}
                  </Text>
                </View>

                {forgotSent ? (
                  <View style={styles.successBlock}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: brand.primary + "14" },
                      ]}
                    >
                      <Text style={{ fontSize: 24, color: brand.primary }}>✉️</Text>
                    </View>
                    <Text
                      variant="bodySmall"
                      style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}
                    >
                      Check your inbox (and spam folder) for the reset link.
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => {
                        setShowForgot(false);
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                      textColor={brand.primary}
                    >
                      ← Back to Sign In
                    </Button>
                  </View>
                ) : (
                  <>
                    <TextInput
                      mode="outlined"
                      label="Your email"
                      value={forgotEmail}
                      onChangeText={(t) => {
                        setForgotEmail(t);
                        setError(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      returnKeyType="send"
                      onSubmitEditing={handleForgot}
                      outlineStyle={styles.inputOutline}
                      style={styles.input}
                      left={<TextInput.Icon icon="email" />}
                    />

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

                    <Button
                      mode="contained"
                      onPress={handleForgot}
                      loading={forgotLoading}
                      disabled={!isValidEmail(forgotEmail) || forgotLoading}
                      buttonColor={paperTheme.colors.primary}
                      textColor={paperTheme.colors.onPrimary}
                      contentStyle={styles.btnContent}
                      style={styles.btn}
                      labelStyle={styles.btnLabel}
                    >
                      Send Reset Link
                    </Button>

                    <Button
                      mode="text"
                      onPress={() => {
                        setShowForgot(false);
                        setError(null);
                      }}
                      textColor={paperTheme.colors.onSurfaceVariant}
                    >
                      ← Back to Sign In
                    </Button>
                  </>
                )}
              </View>

            ) : successMsg ? (
              <View style={styles.formSection}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: brand.primary + "14", alignSelf: "center" },
                  ]}
                >
                  <Text style={{ fontSize: 28, color: brand.primary }}>✉️</Text>
                </View>
                <View style={styles.textGroup}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.heading, { color: paperTheme.colors.onSurface }]}
                  >
                    Check your email
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}
                  >
                    {successMsg}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSuccessMsg(null);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  style={styles.btn}
                  contentStyle={styles.btnContent}
                >
                  Back to Sign In
                </Button>
              </View>

            ) : (
              <View style={styles.formSection}>
                <View style={styles.textGroup}>
                  <Text
                    variant="headlineMedium"
                    style={[styles.heading, { color: paperTheme.colors.onSurface }]}
                  >
                    Welcome to Analogix
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}
                  >
                    Sign in to continue learning
                  </Text>
                </View>

                {/* Mode toggle */}
                <View style={styles.modePill}>
                  {(["signin", "signup"] as const).map((m) => (
                    <Text
                      key={m}
                      style={[
                        styles.modeOption,
                        {
                          color:
                            mode === m
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurfaceVariant,
                          backgroundColor:
                            mode === m ? paperTheme.colors.primary : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setMode(m);
                        setError(null);
                        setSuccessMsg(null);
                        setPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      {m === "signin" ? "Sign In" : "Sign Up"}
                    </Text>
                  ))}
                </View>

                {/* Error */}
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

                {/* Email */}
                <TextInput
                  mode="outlined"
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />

                {/* Password */}
                <TextInput
                  ref={passwordRef}
                  mode="outlined"
                  label={mode === "signin" ? "Password" : "Create password"}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType={mode === "signup" ? "next" : "done"}
                  onSubmitEditing={() => {
                    if (mode === "signup") {
                      confirmRef.current?.focus();
                    } else if (canSubmit) {
                      handleSubmit();
                    }
                  }}
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

                {/* Confirm password (sign-up only) */}
                {mode === "signup" && (
                  <TextInput
                    ref={confirmRef}
                    mode="outlined"
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setError(null);
                    }}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => canSubmit && handleSubmit()}
                    outlineStyle={[
                      styles.inputOutline,
                      confirmPassword && password !== confirmPassword && {
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
                )}

                {/* Mismatch hint */}
                {mode === "signup" && confirmPassword && password !== confirmPassword && (
                  <Text
                    variant="bodySmall"
                    style={{ color: paperTheme.colors.error, fontWeight: "500" }}
                  >
                    Passwords don't match
                  </Text>
                )}

                {/* Submit */}
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={!canSubmit}
                  buttonColor={paperTheme.colors.primary}
                  textColor={paperTheme.colors.onPrimary}
                  contentStyle={styles.btnContent}
                  style={styles.btn}
                  labelStyle={styles.btnLabel}
                >
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Button>

                {/* Forgot password (sign-in only) */}
                {mode === "signin" && (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: paperTheme.colors.onSurfaceVariant,
                      textAlign: "center",
                    }}
                    onPress={() => {
                      setShowForgot(true);
                      setError(null);
                      setForgotEmail(email);
                    }}
                  >
                    Forgot your password?
                  </Text>
                )}
              </View>
            )}

            {/* ── Divider + Google ──────────────────────────────────── */}
            {!showForgot && !successMsg && (
              <View style={styles.dividerSection}>
                <View style={styles.dividerRow}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: paperTheme.colors.onSurfaceVariant,
                      marginHorizontal: 12,
                      fontWeight: "500",
                    }}
                  >
                    or continue with
                  </Text>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                </View>

                <Button
                  mode="outlined"
                  onPress={handleGoogle}
                  loading={busy}
                  disabled={submitting}
                  contentStyle={styles.googleBtnContent}
                  style={styles.googleBtn}
                  labelStyle={styles.btnLabel}
                  accessibilityLabel="Sign in with Google"
                >
                  Continue with Google
                </Button>

                <Text
                  variant="bodySmall"
                  style={[
                    styles.legalese,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  By signing in, you agree to our{" "}
                  <Text
                    style={{ color: brand.primary, fontWeight: "500" }}
                    onPress={() => nav.navigate("Terms")}
                  >
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={{ color: brand.primary, fontWeight: "500" }}
                    onPress={() => nav.navigate("PrivacyPolicy")}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
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
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {},
  orb2: {},
  card: {
    borderRadius: SHAPE.xxl + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 32,
    alignItems: "center",
    gap: 24,
  },
  logoContainer: {
    marginBottom: 4,
  },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  formSection: {
    width: "100%",
    gap: 16,
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
  modePill: {
    flexDirection: "row",
    backgroundColor: "rgba(128,128,128,0.1)",
    borderRadius: 999,
    padding: 3,
    alignSelf: "center",
  },
  modeOption: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    fontWeight: "600",
    fontSize: 14,
    overflow: "hidden",
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
  successBlock: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
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
  dividerSection: {
    width: "100%",
    gap: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleBtn: {
    width: "100%",
    borderRadius: SHAPE.xl,
    borderWidth: 1.5,
  },
  googleBtnContent: {
    height: 50,
  },
  legalese: {
    textAlign: "center",
    lineHeight: 18,
  },
});
