import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function ResourcesScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Text variant="bodyLarge" style={{ textAlign: "center" }}>
        Resources screen — upload PDFs, slides, and study materials. Wired to the BFF's uploadResource mutation.
      </Text>
    </View>
  );
}
