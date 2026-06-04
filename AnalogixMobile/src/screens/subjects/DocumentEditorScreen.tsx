/**
 * Document editor — markdown-style text area (BlockNote on web, plain TextInput v1).
 * Saves to the BFF via updateDocument mutation.
 */
import React, { useState } from "react";
import { View, StyleSheet, TextInput, ScrollView, Alert } from "react-native";
import { Text, useTheme, IconButton, Button, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { DOCUMENT } from "../../graphql/queries/subject";
import { UPDATE_DOCUMENT } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function DocumentEditorScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { documentId } = route.params;
  const { data, loading } = useQuery(DOCUMENT, { variables: { id: documentId } });
  const [updateDocument, { loading: saving }] = useMutation(UPDATE_DOCUMENT);
  const [content, setContent] = useState("");

  React.useEffect(() => {
    if (data?.document?.content && !content) {
      setContent(data.document.content);
    }
  }, [data, content]);

  const save = async () => {
    try {
      await updateDocument({
        variables: {
          input: {
            documentId,
            subjectId: data?.document?.subjectId ?? "",
            content,
          },
        },
      });
      Alert.alert("Saved", "Your changes are live.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} />;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ flex: 1, fontWeight: "800" }}>
          {data?.document?.title ?? "Document"}
        </Text>
        <Button
          mode="contained"
          buttonColor={brand.primary}
          onPress={save}
          loading={saving}
          compact
        >
          Save
        </Button>
      </View>
      <TextInput
        multiline
        value={content}
        onChangeText={setContent}
        placeholder="Start writing…"
        placeholderTextColor={paperTheme.colors.onSurfaceVariant}
        style={[
          styles.editor,
          {
            backgroundColor: paperTheme.colors.surface,
            color: paperTheme.colors.onSurface,
            borderRadius: SHAPE.lg,
          },
        ]}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  editor: {
    flex: 1,
    margin: 16,
    marginBottom: 80,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});
