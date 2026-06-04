import React, { Component, type ReactNode } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SHAPE } from "../theme/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function Fallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const paperTheme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <Text variant="headlineMedium" style={{ fontWeight: "900", marginBottom: 8 }}>Something went wrong</Text>
      <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 16 }}>
        {error.message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: paperTheme.colors.primary, borderRadius: SHAPE.xl }]}
      >
        <Text variant="labelLarge" style={{ color: "#fff", fontWeight: "700" }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <Fallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  button: { paddingHorizontal: 24, paddingVertical: 12 },
});
