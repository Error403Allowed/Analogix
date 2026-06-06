import React, { useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Text, useTheme, ActivityIndicator, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ROOM_DETAIL, ROOM_MESSAGES_SUB, SEND_ROOM_MESSAGE } from "../../graphql/queries/room";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";

export default function RoomDetailScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { roomId, name } = route.params;
  const { data, loading, refetch } = useQuery(ROOM_DETAIL, { variables: { id: roomId } });
  const [sendMessage, { loading: sending }] = useMutation(SEND_ROOM_MESSAGE);
  const [text, setText] = useState("");

  useSubscription(ROOM_MESSAGES_SUB, { variables: { roomId }, onData: () => refetch() });

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    try {
      await sendMessage({ variables: { roomId, content } });
    } catch {
      setText(content);
    }
  };

  if (loading) return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  );

  const room = data?.room;
  const messages = [...(room?.messages ?? [])].reverse();
  const members = room?.members ?? [];
  const docs = room?.documents ?? [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
    >
      <ExpressiveScreen
        title={name ?? "Room"}
        subtitle={`${members.length} members · ${docs.length} docs`}
        onBack={() => navigation.goBack()}
        scroll={false}
        contentStyle={styles.sessionContent}
        actions={
          <View style={styles.avatarRow}>
            {members.slice(0, 3).map((m: any) => (
              <View key={m.id} style={[styles.avatar, { backgroundColor: paperTheme.colors.primary, borderColor: paperTheme.colors.surface }]}>
                <Text style={{ color: paperTheme.colors.onPrimary, fontWeight: "900", fontSize: 11 }}>
                  {(m.user?.name ?? "?").charAt(0)}
                </Text>
              </View>
            ))}
          </View>
        }
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={styles.chat}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <ExpressiveEmptyState icon="message-text-outline" title="Say hi" subtitle="Start the room conversation." />
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.user?.id === "me" && styles.msgRowUser]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: item.user?.id === "me" ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                    borderBottomRightRadius: item.user?.id === "me" ? 6 : 22,
                    borderBottomLeftRadius: item.user?.id === "me" ? 22 : 6,
                  },
                ]}
              >
                <Text style={{ color: item.user?.id === "me" ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, lineHeight: 20 }}>
                  {item.text ?? item.content}
                </Text>
              </View>
            </View>
          )}
        />

        {docs.length > 0 && (
          <ExpressiveCard style={styles.docsCard} tone="low">
            <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 4 }}>Shared docs</Text>
            {docs.map((d: any) => (
              <Text key={d.id} variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>· {d.title}</Text>
            ))}
          </ExpressiveCard>
        )}

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
            placeholder="Message…"
            style={[styles.input, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            outlineStyle={{ borderRadius: SHAPE.pill }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
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
  container: { flex: 1 },
  sessionContent: { flex: 1, paddingHorizontal: 0, paddingBottom: 0 },
  avatarRow: { flexDirection: "row" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginLeft: -6, borderWidth: 2 },
  chat: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  docsCard: { marginHorizontal: 12, marginBottom: 8 },
  composer: { paddingTop: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { borderRadius: SHAPE.pill },
});
