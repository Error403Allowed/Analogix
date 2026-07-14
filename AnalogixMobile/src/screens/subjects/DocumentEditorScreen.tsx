import React, { useState } from "react";
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { Text, useTheme, IconButton, Button, ActivityIndicator, Menu } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT } from "../../graphql/queries/subject";
import { SHAPE } from "../../theme/tokens";
import { RichTextEditor } from "../../components/RichTextEditor";

export default function DocumentEditorScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { documentId, subjectId: routeSubjectId } = route.params;
  const { data, loading } = useQuery(DOCUMENT, { variables: { id: documentId } });
  const [updateDocument, { loading: saving }] = useMutation(UPDATE_DOCUMENT);
  const [deleteDocument] = useMutation(DELETE_DOCUMENT);
  const [menuVisible, setMenuVisible] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  React.useEffect(() => {
    if (data?.document?.content && !content) {
      setContent(data.document.content);
    }
    if (data?.document?.title && !title) {
      setTitle(data.document.title);
    }
  }, [data, content, title]);

  const handleDelete = () => {
    Alert.alert("Delete document", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const subjectId = data?.document?.subjectId ?? routeSubjectId;
          await deleteDocument({ variables: { documentId, subjectId } });
          navigation.goBack();
        },
      },
    ]);
  };

  const save = async () => {
    try {
      await updateDocument({
        variables: { input: { documentId, subjectId: data?.document?.subjectId ?? "", content, title } },
      });
      Alert.alert("Saved", "Your changes are live.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (loading) return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
    >
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, borderBottomColor: paperTheme.colors.outlineVariant, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>
          {title || "Untitled"}
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} accessibilityLabel="Document options" />}
        >
          <Menu.Item onPress={() => { setMenuVisible(false); handleDelete(); }} title="Delete" leadingIcon="delete" />
        </Menu>
        <Button mode="contained" compact onPress={save} loading={saving} style={{ borderRadius: SHAPE.lg, marginRight: 8 }}>
          Save
        </Button>
      </View>

      {Platform.OS === "web" && (
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled"
          placeholderTextColor={paperTheme.colors.onSurfaceVariant + "40"}
          style={[styles.titleInput, { color: paperTheme.colors.onSurface }]}
        />
      )}

      <View style={styles.editorWrap}>
        <RichTextEditor value={content} onChange={setContent} placeholder="Start writing..." />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  editorWrap: { flex: 1, margin: 16 },
  titleInput: {
    fontSize: 36,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  } as any,
});
