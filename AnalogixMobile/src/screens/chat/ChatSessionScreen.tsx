import React, { useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Text, useTheme, ActivityIndicator, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CHAT_MESSAGES, APPEND_CHAT_MESSAGE } from "../../graphql/queries/chat";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";

export default function ChatSessionScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { sessionId } = route.params;
  const { data, loading } = useQuery(CHAT_MESSAGES, { variables: { sessionId }, skip: sessionId === "new" });
  const [sendMessage, { loading: sending }] = useMutation(APPEND_CHAT_MESSAGE);
  const [text, setText] = useState("");

  // Reverse so the newest message anchors to the bottom with inverted FlatList
  const messages = [...(data?.chatMessages ?? [])].reverse();

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    try {
      await sendMessage({ variables: { sessionId, role: "user", content } });
    } catch {
      setText(content);
    }
  };

  if (loading) return (
    <View style={[styles.loadingContainer, { backgroundColor: paperTheme.colors.background }]}>
      <ActivityIndicator />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ExpressiveScreen
        title="Chat"
        eyebrow="Tutor"
        subtitle="Session"
        onBack={() => navigation.goBack()}
        scroll={false}
        contentStyle={styles.sessionContent}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={styles.chat}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <ExpressiveEmptyState
                icon="robot"
                title="Start the conversation"
                subtitle="Ask for an explanation, a quiz, or a study plan."
              />
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.role === "user" && styles.msgRowUser]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor:
                      item.role === "user"
                        ? paperTheme.colors.primary
                        : paperTheme.colors.surfaceVariant,
                    borderBottomRightRadius: item.role === "user" ? 6 : 22,
                    borderBottomLeftRadius: item.role === "user" ? 22 : 6,
                  },
                ]}
              >
                <Text style={{ color: item.role === "user" ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, lineHeight: 20 }}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
        />

        <View
          style={[
            styles.composer,
            {
              backgroundColor: paperTheme.colors.surface,
              paddingBottom: insets.bottom + 8,
              borderTopColor: paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <TextInput
            mode="outlined"
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            style={[styles.input, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            outlineStyle={{ borderRadius: SHAPE.pill }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            left={<TextInput.Icon icon="plus-circle-outline" color={paperTheme.colors.onSurfaceVariant} />}
            right={
              <TextInput.Icon
                icon={sending ? "loading" : "send"}
                color={text.trim() && !sending ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant}
                onPress={handleSend}
                disabled={sending || !text.trim()}
              />
            }
          />
        </View>
      </ExpressiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  sessionContent: { flex: 1, paddingHorizontal: 0, paddingBottom: 0 },
  chat: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  composer: { paddingTop: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { borderRadius: SHAPE.pill },
});
