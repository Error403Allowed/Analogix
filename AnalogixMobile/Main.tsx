/**
 * App entry point — wraps the entire app in:
 *   - Apollo (HTTP + WS + persisted cache)
 *   - Supabase Auth
 *   - SafeArea + GestureHandler root
 *   - React Navigation
 */
import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApolloRootProvider } from "./src/apollo/ApolloProvider";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
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
