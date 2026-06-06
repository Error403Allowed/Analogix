import React, { useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Text, useTheme, Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "../../context/AuthContext";
import { getSupabase } from "../../supabase";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveHeroPanel } from "../../components/expressive";
import Icon from "../../components/Icon";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { signInWithGoogleIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setBusy(true);
      setError(null);
      const supabase = getSupabase();

      if (Platform.OS !== "web") {
        // Native: use expo-web-browser for the OAuth redirect flow
        const redirectTo = makeRedirectUri({ scheme: "analogix", path: "auth/callback" });
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type !== "success") setBusy(false);
        }
      } else {
        // Web fallback
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
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View
        style={[
          styles.inner,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        <ExpressiveHeroPanel style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: paperTheme.colors.surface }]}>
            <Text style={[styles.logoText, { color: paperTheme.colors.primary }]}>A</Text>
          </View>
          <View style={styles.heroArt}>
            <Icon name="triangle-rounded" size={54} color={paperTheme.colors.onPrimaryContainer} />
            <Icon name="shape" size={54} color={paperTheme.colors.onPrimaryContainer} />
            <Icon name="square-rounded" size={54} color={paperTheme.colors.onPrimaryContainer} />
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: paperTheme.colors.onPrimaryContainer }]}>
            Analogix
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: paperTheme.colors.onPrimaryContainer }]}>
            Your AI study buddy, on the go.
          </Text>
        </ExpressiveHeroPanel>

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="google"
            onPress={handleSignIn}
            loading={busy}
            style={{ borderRadius: SHAPE.lg }}
            contentStyle={{ height: 52 }}
            accessibilityLabel="Sign in with Google"
          >
            Continue with Google
          </Button>
          {error && (
            <Text variant="bodySmall" style={{ color: paperTheme.colors.error, textAlign: "center" }}>{error}</Text>
          )}
          <Text variant="bodySmall" style={[styles.legalese, { color: paperTheme.colors.onSurfaceVariant }]}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: { alignItems: "center", gap: 16, minHeight: 360, justifyContent: "center" },
  heroArt: { flexDirection: "row", gap: 2, opacity: 0.26, marginVertical: 6 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: SHAPE.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { color: "#fff", fontWeight: "900", fontSize: 40 },
  title: { fontWeight: "700" },
  subtitle: { textAlign: "center" },
  actions: { gap: 16 },
  legalese: { textAlign: "center" },
});
