/**
 * App entry point — wraps the entire app in:
 *   - Apollo (HTTP + WS + persisted cache)
 *   - Supabase Auth
 *   - SafeArea + GestureHandler root
 *   - React Navigation
 */
import "react-native-gesture-handler";
import React from "react";
import { Platform, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
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
import { TourProvider } from "./src/context/TourContext";
import { TourOverlay } from "./src/components/TourOverlay";
import { TourAutoTrigger } from "./src/components/TourAutoTrigger";
import TutorialOverlay from "./src/components/TutorialOverlay";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <ApolloRootProvider>
          <ThemeProvider>
            <AuthProvider>
              <TourProvider>
                <StatusBar style="auto" />
                <RootNavigator />
                <TourOverlay />
                <TutorialOverlay />
              </TourProvider>
            </AuthProvider>
          </ThemeProvider>
        </ApolloRootProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
