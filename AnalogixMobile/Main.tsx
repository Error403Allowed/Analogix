/**
 * App entry point — wraps the entire app in:
 *   - Apollo (HTTP + WS + persisted cache)
 *   - Supabase Auth
 *   - SafeArea + GestureHandler root
 *   - React Navigation
 */
// Polyfill: silently swallow "Extension context invalidated" errors that can
// appear when Chrome DevTools extensions (e.g. React DevTools) lose their
// background page context during hot-reload or reconnections.
if (typeof __DEV__ !== "undefined" && __DEV__) {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0] instanceof Error ? args[0].message : typeof args[0] === "string" ? args[0] : "";
    if (msg && (msg.includes("Extension context invalidated") || msg.includes("chrome.runtime"))) return;
    if (msg && msg.includes("Unexpected text node") && msg.includes("A text node cannot be a child of a <View>")) {
      origConsoleError.apply(console, [...args, new Error(msg).stack]);
      return;
    }
    origConsoleError.apply(console, args);
  };
  const origConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args[0] instanceof Error ? args[0].message : typeof args[0] === "string" ? args[0] : "";
    if (msg && msg.includes("Extension context invalidated")) return;
    origConsoleWarn.apply(console, args);
  };
}
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { Platform, Animated, View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Device from "expo-device";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

if (Platform.OS === "web") {
  try {
    if (Animated?.timing) {
      (Animated.timing as any).defaults = { useNativeDriver: false };
    }
  } catch { /* ignore on older RN versions */ }
}
import { ApolloRootProvider } from "./src/apollo/ApolloProvider";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";

function SecurityGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;
    preventScreenCaptureAsync().catch(() => {});
    Device.isRootedExperimentalAsync().then((isRooted) => {
      if (isRooted) setBlocked(true);
    });
  }, []);

  if (blocked) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Security Risk</Text>
        <Text style={styles.blockedText}>
          This app cannot run on a device with detected root/jailbreak access for security reasons.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <SecurityGate>
          <ApolloRootProvider>
            <ThemeProvider>
              <AuthProvider>
                <StatusBar style="auto" />
                <RootNavigator />
              </AuthProvider>
            </ThemeProvider>
          </ApolloRootProvider>
        </SecurityGate>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#dc2626",
  },
  blockedText: {
    fontSize: 15,
    textAlign: "center",
    color: "#6b7280",
    lineHeight: 22,
  },
});
