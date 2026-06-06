import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Text, useTheme, Searchbar, FAB } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { CHAT_SESSIONS } from "../../graphql/queries/chat";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import {
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

function BlinkingRobot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    };
    const timer = setInterval(() => {
      blink();
    }, 4000);
    return () => clearInterval(timer);
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Icon name="robot" size={22} color="#fff" />
    </Animated.View>
  );
}

export default function ChatListScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const { data, loading } = useQuery(CHAT_SESSIONS);
  const sessions = data?.chatSessions ?? [];
  const filtered = q ? sessions.filter((s: any) => (s.name ?? s.subject ?? "").toLowerCase().includes(q.toLowerCase())) : sessions;

  return (
    <ExpressiveScreen
      title="Tutor"
      subtitle={`${filtered.length} conversation${filtered.length !== 1 ? "s" : ""}`}
      leadingIcon={<BlinkingRobot />}
      fab={
        <FAB icon="plus" label="New chat" color={paperTheme.colors.onPrimary} style={{ backgroundColor: paperTheme.colors.primary, borderRadius: SHAPE.lg }} onPress={() => navigation.navigate("ChatSession", { sessionId: "new" })} />
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
          filtered.map((s: any) => (
            <ExpressiveListRow
              key={s.id}
              title={s.name ?? s.subject ?? "Chat"}
              subtitle={s.lastMessage ?? "No messages yet"}
              icon="robot"
              onPress={() => navigation.navigate("ChatSession", { sessionId: s.id })}
              trailing={
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, maxWidth: 72 }} numberOfLines={1}>
                  {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ""}
                </Text>
              }
            />
          ))
        )}
        </View>
      </ExpressiveSection>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 150, gap: 8, justifyContent: "center" },
  search: { borderRadius: SHAPE.pill },
  list: { gap: 8 },
});
