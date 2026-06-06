import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, Card, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function ResourcesScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Resources</Text>
      </View>
      <View style={styles.center}>
        <Icon name="folder" size={64} color={paperTheme.colors.onSurfaceVariant} />
        <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16, paddingHorizontal: 32 }}>
          Upload PDFs, slides, and study materials.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
