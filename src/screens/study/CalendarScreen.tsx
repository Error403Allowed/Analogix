/**
 * Calendar — month view with events + deadlines. Add event via sheet.
 * (Full month grid using View+Date math — lightweight, no extra deps.)
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, IconButton, FAB, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { EVENTS } from "../../graphql/queries/calendar";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

function buildMonthGrid(date: Date): Array<Date | null> {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const out: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) out.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) out.push(new Date(date.getFullYear(), date.getMonth(), d));
  while (out.length % 7 !== 0) out.push(null);
  return out;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const size = useScreenSize();
  const isCompact = size === "compact";
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());
  const { data, loading, refetch } = useQuery(EVENTS);
  const grid = buildMonthGrid(cursor);
  const events = data?.events ?? [];
  const deadlines = data?.deadlines ?? [];

  const eventsFor = (d: Date) =>
    events.filter((e: any) => sameDay(new Date(e.date), d));
  const deadlinesFor = (d: Date) =>
    deadlines.filter((dl: any) => sameDay(new Date(dl.dueDate), d));

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <View>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Your</Text>
          <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Calendar</Text>
        </View>
      </View>

      <View style={styles.monthNav}>
        <IconButton icon="chevron-left" onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} />
        <Text variant="titleLarge" style={{ fontWeight: "800" }}>
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <IconButton icon="chevron-right" onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} />
      </View>

      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} variant="labelSmall" style={styles.weekLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const isToday = sameDay(d, new Date());
          const isSelected = selected && sameDay(d, selected);
          const has = eventsFor(d).length + deadlinesFor(d).length;
          return (
            <Pressable
              key={i}
              onPress={() => setSelected(d)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  {
                    backgroundColor: isSelected ? brand.primary : isToday ? `${brand.primary}33` : "transparent",
                    borderRadius: SHAPE.lg,
                  },
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isSelected ? "#fff" : paperTheme.colors.onSurface,
                    fontWeight: isToday ? "800" : "500",
                  }}
                >
                  {d.getDate()}
                </Text>
                {has > 0 && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? "#fff" : brand.tertiary }]} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {selected ? selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) : "Pick a day"}
        </Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            {eventsFor(selected ?? new Date()).map((e: any) => (
              <View key={e.id} style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${brand.tertiary}22` }]}>
                  <Icon name="calendar" size={20} color={brand.tertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{e.title}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{e.type}{e.subject ? ` · ${e.subject}` : ""}</Text>
                </View>
              </View>
            ))}
            {deadlinesFor(selected ?? new Date()).map((d: any) => (
              <View key={d.id} style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${paperTheme.colors.error}22` }]}>
                  <Icon name="alert-circle" size={20} color={paperTheme.colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{d.title}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Deadline · {d.subject ?? "General"}</Text>
                </View>
              </View>
            ))}
            {eventsFor(selected ?? new Date()).length + deadlinesFor(selected ?? new Date()).length === 0 && (
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32 }}>
                Nothing on this day.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: brand.primary }]}
        color="#fff"
        onPress={() => {
          // TODO: open add-event sheet
        }}
      />
    </View>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontWeight: "900" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  weekRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  weekLabel: { flex: 1, textAlign: "center", fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  day: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  list: { padding: 20, gap: 8, paddingBottom: 100 },
  sectionTitle: { fontWeight: "800", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 16, bottom: 100 },
});
