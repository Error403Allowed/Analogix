import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { EVENTS } from "../../graphql/queries/calendar";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [month, setMonth] = useState(new Date());
  const { data } = useQuery(EVENTS);
  const events = data?.events ?? [];

  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const startDay = new Date(year, m, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setMonth(new Date(year, m - 1, 1));
  const nextMonth = () => setMonth(new Date(year, m + 1, 1));

  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Calendar</Text>
      </View>

      <View style={styles.monthNav}>
        <IconButton icon="chevron-left" onPress={prevMonth} />
        <Text variant="titleMedium" style={{ fontWeight: "600" }}>{monthName}</Text>
        <IconButton icon="chevron-right" onPress={nextMonth} />
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <Text key={d} variant="labelSmall" style={{ flex: 1, textAlign: "center", color: paperTheme.colors.onSurfaceVariant }}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: startDay }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {days.map((d) => {
          const hasEvent = events.some((e: any) => {
            const date = new Date(e.date ?? e.start);
            return date.getDate() === d && date.getMonth() === m && date.getFullYear() === year;
          });
          return (
            <View key={d} style={styles.dayCell}>
              <View style={[styles.dayNum, hasEvent && { backgroundColor: brand.primary + "18", borderRadius: SHAPE.lg }]}>
                <Text variant="bodyMedium" style={{ fontWeight: hasEvent ? "700" : "400", color: paperTheme.colors.onSurface }}>{d}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text variant="titleSmall" style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        UPCOMING
      </Text>
      <ScrollView contentContainerStyle={styles.eventList}>
        {events.map((e: any) => (
          <Card key={e.id} mode="outlined" style={styles.eventCard} onPress={() => navigation.navigate("EventDetail", { eventId: e.id })}>
            <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.eventDot, { backgroundColor: brand.primary }]} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{e.name ?? e.title}</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  {new Date(e.date ?? e.start).toLocaleDateString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  weekdays: { flexDirection: "row", paddingHorizontal: 8, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, marginTop: 4 },
  dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayNum: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontWeight: "700", letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  eventList: { paddingHorizontal: 16, paddingBottom: 100, gap: 8 },
  eventCard: { borderRadius: SHAPE.lg },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
});
