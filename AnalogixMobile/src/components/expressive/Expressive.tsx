import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Text, useTheme, type MD3Theme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../Icon";
import { MOTION, SHAPE } from "../../theme/tokens";

type ExpressiveColorRole =
  | "surfaceContainerLowest"
  | "surfaceContainerLow"
  | "surfaceContainer"
  | "surfaceContainerHigh"
  | "surfaceContainerHighest"
  | "surfaceBright"
  | "surfaceDim";

type ExpressiveColors = MD3Theme["colors"] & Record<ExpressiveColorRole, string>;

function colors(theme: MD3Theme): ExpressiveColors {
  return theme.colors as ExpressiveColors;
}

type PressableScaleProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
};

export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        disabled={disabled || !onPress}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? (onPress ? "button" : "none")}
        onPressIn={() => { scale.value = withSpring(0.975, MOTION.tap); }}
        onPressOut={() => { scale.value = withSpring(1, MOTION.tap); }}
      />
      {children}
    </Animated.View>
  );
}

type ExpressiveScreenProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  leadingIcon?: string | React.ReactNode;
  onBack?: () => void;
  actions?: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  fab?: React.ReactNode;
  children?: React.ReactNode;
};

export function ExpressiveScreen({
  title,
  eyebrow,
  subtitle,
  leadingIcon,
  onBack,
  actions,
  scroll = true,
  contentStyle,
  fab,
  children,
}: ExpressiveScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const c = colors(theme);
  const bg = (c.surface ?? theme.colors.background) as string;

  const header = (
    <View style={[styles.screenHeader, { paddingTop: insets.top + 8, backgroundColor: bg, borderBottomColor: c.outlineVariant }]}>
      <View style={styles.screenHeaderTop}>
        <View style={styles.screenHeaderLeft}>
          {onBack && (
            <Pressable onPress={onBack} style={styles.screenBack} accessibilityLabel="Go back" accessibilityRole="button">
              <Icon name="arrow-left" size={24} color={theme.colors.onSurface} />
            </Pressable>
          )}
          {leadingIcon && (
            <View style={[styles.screenLeadingIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              {typeof leadingIcon === 'string' ? (
                <Icon name={leadingIcon} size={22} color={theme.colors.onPrimaryContainer} />
              ) : (
                leadingIcon
              )}
            </View>
          )}
          <View style={styles.screenTitleGroup}>
            <Text variant="titleLarge" numberOfLines={1} style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {actions && (
          <View style={styles.screenActions}>
            {actions}
          </View>
        )}
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: bg }]}>
        {header}
        <View style={[styles.screenContent, contentStyle]}>
          {children}
        </View>
        {fab}
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: bg }]}>
      {header}
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[styles.screenContent, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {fab && (
        <View style={styles.fabContainer}>
          {fab}
        </View>
      )}
    </View>
  );
}

type ExpressiveCardProps = {
  tone?: "high" | "low";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ExpressiveCard({ tone = "low", onPress, style, children }: ExpressiveCardProps) {
  const theme = useTheme();
  const c = colors(theme);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: tone === "high" ? c.surfaceContainerLow : theme.colors.surface,
      borderColor: c.outlineVariant,
      ...(tone === "high" ? shadows.sm : {}),
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={cardStyle} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

type ExpressiveSectionProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
};

export function ExpressiveSection({ title, actionLabel, onAction, children }: ExpressiveSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
          {title}
        </Text>
        {actionLabel && onAction && (
          <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: "800" }}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

type ExpressiveHeroPanelProps = {
  accent?: "primary" | "secondary" | "tertiary";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ExpressiveHeroPanel({ accent = "primary", style, children }: ExpressiveHeroPanelProps) {
  const theme = useTheme();
  const c = colors(theme);

  const bgColorKey = (accent === "primary" ? "primaryContainer" :
    accent === "secondary" ? "secondaryContainer" :
    "tertiaryContainer") as keyof MD3Theme["colors"];
  const bgColor = theme.colors[bgColorKey] as string;

  return (
    <View style={[styles.heroPanel, { backgroundColor: bgColor }, style]}>
      {children}
    </View>
  );
}

type ExpressiveListRowProps = {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ExpressiveListRow({ title, subtitle, icon: iconName, onPress, trailing, style }: ExpressiveListRowProps) {
  const theme = useTheme();
  const c = colors(theme);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant }, style]}
      accessibilityRole="button"
    >
      <View style={[styles.listRowIconWrap, { backgroundColor: theme.colors.secondaryContainer }]}>
        <Icon name={iconName} size={20} color={theme.colors.onSecondaryContainer} />
      </View>
      <View style={styles.listRowTextGroup}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && (
        <View style={styles.listRowTrailing}>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

type ExpressiveRailCardProps = {
  value: string | number;
  label: string;
  icon: string;
  style?: StyleProp<ViewStyle>;
};

export function ExpressiveRailCard({ value, label, icon: iconName, style }: ExpressiveRailCardProps) {
  const theme = useTheme();
  const c = colors(theme);

  return (
    <View style={[styles.railCard, { backgroundColor: theme.colors.surface, borderColor: c.outlineVariant }, style]}>
      <View style={[styles.railIconWrap, { backgroundColor: theme.colors.secondaryContainer }]}>
        <Icon name={iconName} size={18} color={theme.colors.onSecondaryContainer} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

type ExpressiveActionPillProps = {
  label: string;
  icon: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ExpressiveActionPill({ label, icon: iconName, onPress, style }: ExpressiveActionPillProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionPill, { backgroundColor: theme.colors.primary }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={iconName} size={16} color={theme.colors.onPrimary} />
      <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

type ExpressiveEmptyStateProps = {
  icon: string;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
};

export function ExpressiveEmptyState({ icon: iconName, title, subtitle, style }: ExpressiveEmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.emptyState, style]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon name={iconName} size={36} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900", textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
        {subtitle}
      </Text>
    </View>
  );
}

const shadows = StyleSheet.create({
  sm: {
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  } as ViewStyle,
});

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  screenHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  screenBack: {
    width: 36,
    height: 36,
    borderRadius: SHAPE.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  screenLeadingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  screenTitleGroup: {
    flex: 1,
    gap: 1,
  },
  screenActions: {
    marginLeft: 12,
    marginTop: 2,
  },
  screenContent: {
    padding: 16,
    gap: 20,
  },
  screenScroll: {
    flex: 1,
  },

  card: {
    borderRadius: SHAPE.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: "hidden",
  },

  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroPanel: {
    borderRadius: SHAPE.xl,
    padding: 20,
    overflow: "hidden",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: SHAPE.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listRowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowTextGroup: {
    flex: 1,
    gap: 2,
  },
  listRowTrailing: {
    marginLeft: 4,
  },

  railCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: SHAPE.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  railIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: SHAPE.pill,
    alignSelf: "flex-start",
  },

  fabContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },

  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
