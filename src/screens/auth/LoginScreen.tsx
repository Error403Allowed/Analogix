import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { getSupabase } from "../../supabase";
import { SHAPE } from "../../theme/tokens";
import { useThemeContext } from "../../theme/ThemeContext";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const { signInWithGoogleIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setBusy(true);
      setError(null);
      if (Platform.OS !== "web") {
        throw new Error("Web sign-in only");
      }
      const supabase = getSupabase();
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthErr) throw oauthErr;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Failed to start sign-in");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inner}
      >
        <Animated.View entering={FadeInUp.duration(500)} style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: brand.primary }]}>
            <Text variant="displayMedium" style={styles.logoText}>
              A
            </Text>
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
            Analogix
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            Your AI study buddy, on the go.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.actions}>
          <Button
            mode="contained"
            icon="google"
            onPress={handleSignIn}
            loading={busy}
            style={[styles.googleButton, { borderRadius: SHAPE.xl, backgroundColor: brand.primary }]}
            labelStyle={styles.buttonLabel}
          >
            Continue with Google
          </Button>
          {error ? (
            <Text style={[styles.error, { color: paperTheme.colors.error }]}>{error}</Text>
          ) : null}
          <Text variant="bodySmall" style={[styles.legalese, { color: paperTheme.colors.onSurfaceVariant }]}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 32,
  },
  hero: { alignItems: "center", gap: 16 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: SHAPE.xxl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { color: "#fff", fontWeight: "900" },
  title: { fontWeight: "900" },
  subtitle: { textAlign: "center" },
  actions: { gap: 16 },
  googleButton: { marginTop: 8 },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
  error: { textAlign: "center" },
  legalese: { textAlign: "center" },
});
