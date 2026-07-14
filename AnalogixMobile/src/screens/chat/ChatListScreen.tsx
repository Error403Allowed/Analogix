import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Animated as RNAnimated, Alert } from "react-native";
import { Text, useTheme, Searchbar, FAB, Portal, Modal, TextInput, Button } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CHAT_SESSIONS, DELETE_CHAT_SESSION, UPDATE_CHAT_SESSION } from "../../graphql/queries/chat";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import {
  ExpressiveEmptyState,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

function BlinkingRobot() {
  const opacity = React.useRef(new RNAnimated.Value(1)).current;

  React.useEffect(() => {
    const blink = () => {
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 0.2, duration: 100, useNativeDriver: false }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: false }),
      ]).start();
    };
    const timer = setInterval(() => blink(), 4000);
    return () => clearInterval(timer);
  }, [opacity]);

  return (
    <RNAnimated.View style={{ opacity }}>
      <Icon name="robot" size={22} color="#fff" />
    </RNAnimated.View>
  );
}

export default function ChatListScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [q, setQ] = useState("");
  const { data, refetch } = useQuery(CHAT_SESSIONS);

  // Auto-navigate to a new chat when subjectId is passed from a subject detail
  useEffect(() => {
    const subjectId = route.params?.subjectId;
    if (subjectId) {
      navigation.navigate("ChatSession", { sessionId: "new", subjectId });
    }
  }, [route.params?.subjectId, navigation]);
  const [deleteSession] = useMutation(DELETE_CHAT_SESSION);
  const [updateSession] = useMutation(UPDATE_CHAT_SESSION);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const sessions = data?.chatSessions ?? [];
  const filtered = q
    ? sessions.filter((s: any) => (s.title ?? s.lastMessage ?? "").toLowerCase().includes(q.toLowerCase()))
    : sessions;

  const handleSessionPress = useCallback((s: any) => {
    navigation.navigate("ChatSession", {
      sessionId: s.id,
      subjectId: s.subjectId ?? "general",
      title: s.title,
    });
  }, [navigation]);

  const handleSessionLongPress = useCallback((s: any) => {
    Alert.alert(s.title ?? "Chat", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Rename",
        onPress: () => {
          setRenameTarget({ id: s.id, title: s.title ?? "" });
          setRenameValue(s.title ?? "");
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession({ variables: { id: s.id } });
          refetch();
        },
      },
    ]);
  }, [deleteSession, refetch]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await updateSession({ variables: { id: renameTarget.id, title: renameValue.trim() } });
    setRenameTarget(null);
    setRenameValue("");
    refetch();
  }, [renameTarget, renameValue, updateSession, refetch]);

  return (
    <ExpressiveScreen
      title="Tutor"
      subtitle={`${filtered.length} conversation${filtered.length !== 1 ? "s" : ""}`}
      leadingIcon={<BlinkingRobot />}
      fab={
        <FAB
          icon="plus"
          label="New chat"
          color={paperTheme.colors.onPrimary}
          style={{ backgroundColor: paperTheme.colors.primary, borderRadius: SHAPE.lg }}
          onPress={() => navigation.navigate("ChatSession", { sessionId: "new", subjectId: "general" })}
        />
      }
    >
      <Searchbar
        placeholder="Search conversations"
        value={q}
        onChangeText={setQ}
        style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        inputStyle={{ fontSize: 14 }}
      />

      <ExpressiveSection title="Conversations">
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <ExpressiveEmptyState icon="message-text-outline" title="No conversations yet" subtitle="Tap New chat to start studying with AI." />
          ) : (
            filtered.map((s: any, index: number) => (
              <Animated.View
                key={s.id}
                entering={FadeInDown.duration(300).delay(index * 50).springify().damping(24)}
              >
                <ExpressiveListRow
                  title={s.title ?? "Chat"}
                  subtitle={s.lastMessage ?? "No messages yet"}
                  icon="robot"
                  onPress={() => handleSessionPress(s)}
                  onLongPress={() => handleSessionLongPress(s)}
                  trailing={
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, maxWidth: 72 }} numberOfLines={1}>
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ""}
                    </Text>
                  }
                />
              </Animated.View>
            ))
          )}
        </View>
      </ExpressiveSection>

      <Portal>
        <Modal visible={Boolean(renameTarget)} onDismiss={() => setRenameTarget(null)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Rename chat</Text>
          <TextInput mode="outlined" label="Title" value={renameValue} onChangeText={setRenameValue} style={{ marginBottom: 16 }} />
          <Button mode="contained" onPress={handleRename} disabled={!renameValue.trim()}>
            Save
          </Button>
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  search: { borderRadius: SHAPE.pill },
  list: { gap: 8 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});
