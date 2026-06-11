import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Platform, Image, useWindowDimensions } from "react-native";
import { Text, useTheme, Button } from "react-native-paper";
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

function useNativeDriver() {
  return Platform.OS !== "web";
}

function FloatingOrbs({ primary, secondary }: { primary: string; secondary: string }) {
  const { width: W, height: H } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, 20]) },
      { translateY: interpolate(t.value, [0, 1], [0, -16]) },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, -14]) },
      { translateY: interpolate(t.value, [0, 1], [0, 12]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { backgroundColor: primary, opacity: 0.04, width: 320, height: 320, top: -80, right: -60 },
          orb1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { backgroundColor: secondary, opacity: 0.04, width: 260, height: 260, bottom: -40, left: -60 },
          orb2Style,
        ]}
      />
    </View>
  );
}

export default function LoginScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const useNative = useNativeDriver();

  const handleSignIn = useCallback(async () => {
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
              const { error: exchangeErr } =
                await supabase.auth.exchangeCodeForSession(code);
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

  return (
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

        <View style={styles.textGroup}>
          <Text variant="headlineMedium" style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
            Welcome to Analogix
          </Text>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
            Sign in to continue learning
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: paperTheme.colors.errorContainer }]}>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onErrorContainer }}>
              {error}
            </Text>
          </View>
        )}

        <Animated.View style={[{ width: "100%" }, btnAnimStyle]}>
          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={busy}
            buttonColor={paperTheme.colors.primary}
            textColor={paperTheme.colors.onPrimary}
            contentStyle={styles.btnContent}
            style={styles.btn}
            labelStyle={styles.btnLabel}
            accessibilityLabel="Sign in with Google"
          >
            Continue with Google
          </Button>
        </Animated.View>

        <Text variant="bodySmall" style={[styles.legalese, { color: paperTheme.colors.onSurfaceVariant }]}>
          By signing in, you agree to our{" "}
          <Text style={{ color: brand.primary, fontWeight: "500" }} onPress={() => nav.navigate("Terms")}>
            Terms
          </Text>
          {" "}and{" "}
          <Text style={{ color: brand.primary, fontWeight: "500" }} onPress={() => nav.navigate("PrivacyPolicy")}>
            Privacy Policy
          </Text>.
        </Text>
      </Animated.View>
    </View>
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
  textGroup: {
    gap: 6,
  },
  heading: {
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  errorBox: {
    width: "100%",
    padding: 12,
    borderRadius: SHAPE.md,
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
  legalese: {
    textAlign: "center",
    lineHeight: 18,
  },
});
