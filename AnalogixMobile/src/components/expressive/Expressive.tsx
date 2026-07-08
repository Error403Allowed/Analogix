import React, { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  Platform,
} from "react-native";
import { Text, useTheme, type MD3Theme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  useDerivedValue,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";
import Icon from "../Icon";
import { MOTION, SHAPE } from "../../theme/tokens";

const M3_TOUCH = 48;
const M3_ICON_PRIMARY = 24;
const M3_ICON_SECONDARY = 20;
const M3_ICON_TERTIARY = 16;

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
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number } | undefined;
};

export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  hitSlop,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, MOTION.tap);
    if (Platform.OS === "ios") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const haptics = require("expo-haptics");
        haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
      } catch { /* haptics unavailable */ }
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, MOTION.tap);
  }, [scale]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        disabled={disabled || !onPress}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? (onPress ? "button" : "none")}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={hitSlop}
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
              <Icon name="arrow-left" size={M3_ICON_SECONDARY} color={theme.colors.primary} />
            </Pressable>
          )}
          {leadingIcon && (
            <View style={[styles.screenLeadingIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              {typeof leadingIcon === 'string' ? (
                <Icon name={leadingIcon} size={M3_ICON_SECONDARY} color={theme.colors.onPrimaryContainer} />
              ) : (
                leadingIcon
              )}
            </View>
          )}
          <View style={styles.screenTitleGroup}>
            {eyebrow ? (
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700", letterSpacing: 0.5, marginBottom: -1 }}>
                {eyebrow}
              </Text>
            ) : null}
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
        <View style={[styles.screenContent, contentStyle, { flex: 1 }]}>
          {children}
        </View>
        {fab && (
          <View style={styles.fabContainer}>
            {fab}
          </View>
        )}
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

  const elevation = useSharedValue(0);
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(elevation.value, [0, 1], [0, -2]) }],
  }));

  const handlePressIn = useCallback(() => {
    elevation.value = withSpring(1, MOTION.tap);
  }, [elevation]);

  const handlePressOut = useCallback(() => {
    elevation.value = withSpring(0, { ...MOTION.tap, stiffness: 200 });
  }, [elevation]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: tone === "high" ? c.surfaceContainerLow : theme.colors.surface,
      borderColor: c.outlineVariant,
    },
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={animatedCardStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyle}
          accessibilityRole="button"
        >
          {children}
        </Pressable>
      </Animated.View>
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
          <PressableScale onPress={onAction}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: "800" }}>
              {actionLabel}
            </Text>
          </PressableScale>
        )}
      </View>
      <Animated.View entering={FadeInDown.duration(300).springify().damping(24).stiffness(260)}>
        {children}
      </Animated.View>
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

  const bgColorKey = (accent === "primary" ? "primaryContainer" :
    accent === "secondary" ? "secondaryContainer" :
    "tertiaryContainer") as keyof MD3Theme["colors"];
  const bgColor = theme.colors[bgColorKey] as string;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(22).stiffness(200)}
      style={[styles.heroPanel, { backgroundColor: bgColor }, style]}
    >
      {children}
    </Animated.View>
  );
}

type ExpressiveListRowProps = {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  onLongPress?: () => void;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ExpressiveListRow({ title, subtitle, icon: iconName, onPress, onLongPress, trailing, style }: ExpressiveListRowProps) {
  const theme = useTheme();
  const c = colors(theme);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, MOTION.tap);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, MOTION.tap);
  }, [scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.listRow, { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant }, style]}
      >
        <View style={[styles.listRowIconWrap, { backgroundColor: theme.colors.primary + "1A" }]}>
          <Icon name={iconName} size={M3_ICON_SECONDARY} color={theme.colors.primary} />
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
    </Animated.View>
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
      <View style={[styles.railIconWrap, { backgroundColor: theme.colors.primary + "1A" }]}>
        <Icon name={iconName} size={M3_ICON_TERTIARY} color={theme.colors.primary} />
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

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, MOTION.tap);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, MOTION.tap);
  }, [scale]);

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.actionPill, { backgroundColor: theme.colors.primary }]}
      >
        <Icon name={iconName} size={M3_ICON_TERTIARY} color={theme.colors.onPrimary} />
        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, fontWeight: "800" }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(20)}
      style={[styles.emptyState, style]}
    >
      <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primary + "1A" }]}>
        <Icon name={iconName} size={36} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900", textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

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
    width: M3_TOUCH,
    height: M3_TOUCH,
    borderRadius: SHAPE.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  screenLeadingIcon: {
    width: M3_TOUCH,
    height: M3_TOUCH,
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
    gap: 24,
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
    gap: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: SHAPE.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  listRowIconWrap: {
    width: M3_TOUCH,
    height: M3_TOUCH,
    borderRadius: 14,
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
    minHeight: 80,
  },
  railIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    minHeight: M3_TOUCH,
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
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
