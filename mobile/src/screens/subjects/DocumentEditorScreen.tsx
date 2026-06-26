import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { Text, useTheme, IconButton, Button, ActivityIndicator, Menu } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT } from "../../graphql/queries/subject";
import { SHAPE } from "../../theme/tokens";

export default function DocumentEditorScreen() {
  const paperTheme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { documentId, subjectId: routeSubjectId } = route.params;
  const { data, loading } = useQuery(DOCUMENT, { variables: { id: documentId } });
  const [updateDocument, { loading: saving }] = useMutation(UPDATE_DOCUMENT);
  const [deleteDocument] = useMutation(DELETE_DOCUMENT);
  const [menuVisible, setMenuVisible] = useState(false);
  const [content, setContent] = useState("");

  React.useEffect(() => {
    if (data?.document?.content && !content) {
      setContent(data.document.content);
    }
  }, [data, content]);

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
        variables: { input: { documentId, subjectId: data?.document?.subjectId ?? "", content } },
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
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>
          {data?.document?.title ?? "Document"}
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
      <View style={[styles.editorWrap, { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outline }]}>
        <TextInput
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="Start writing..."
          placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          style={[styles.editor, { color: paperTheme.colors.onSurface }]}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  editorWrap: { flex: 1, margin: 16, borderRadius: SHAPE.lg, borderWidth: 1, overflow: "hidden" },
  editor: { flex: 1, padding: 16, fontSize: 16, lineHeight: 24 },
});
