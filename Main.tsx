/**
 * App entry point — wraps the entire app in:
 *   - Space Grotesk font loading
 *   - MMKV theme + mode
 *   - Apollo (HTTP + WS + persisted cache)
 *   - Supabase Auth
 *   - SafeArea + GestureHandler root
 *   - React Navigation
 */
import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { ApolloRootProvider } from "./src/apollo/ApolloProvider";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1A" }}>
        <ActivityIndicator size="large" color="#5B5FE9" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <ApolloRootProvider>
          <ThemeProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </ApolloRootProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
