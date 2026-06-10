import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Modal, Animated, Dimensions } from "react-native";
import { Text, useTheme, Button, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTour } from "../context/TourContext";
import { useThemeContext } from "../theme/ThemeContext";
import { SHAPE } from "../theme/tokens";
import Icon from "./Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function TourOverlay() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const { activeTour, currentStep, nextStep, prevStep, endTour } = useTour();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (activeTour) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [activeTour, currentStep, fadeAnim, slideAnim]);

  if (!activeTour) return null;

  const step = activeTour.steps[currentStep];
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / activeTour.steps.length) * 100;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={endTour}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: paperTheme.colors.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: brand.primary }]} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step.icon && (
                <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                  <Text style={{ fontSize: 20 }}>{step.icon}</Text>
                </View>
              )}
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>
                Step {currentStep + 1} of {activeTour.steps.length}
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={endTour} />
          </View>

          <View style={styles.content}>
            <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8 }}>
              {step.title}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, lineHeight: 22 }}>
              {step.content}
            </Text>
            {step.action && (
              <Button
                mode="contained"
                buttonColor={brand.primary}
                style={{ borderRadius: SHAPE.lg, marginTop: 16 }}
                onPress={step.action.onPress}
              >
                {step.action.label}
              </Button>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: paperTheme.colors.outlineVariant }]}>
            <Button
              mode="text"
              onPress={prevStep}
              disabled={isFirstStep}
              textColor={paperTheme.colors.onSurfaceVariant}
              style={{ opacity: isFirstStep ? 0.4 : 1 }}
            >
              Back
            </Button>

            <View style={styles.dots}>
              {activeTour.steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === currentStep
                          ? brand.primary
                          : index < currentStep
                          ? brand.primary + "60"
                          : paperTheme.colors.outlineVariant,
                      width: index === currentStep ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <Button
              mode="contained"
              buttonColor={brand.primary}
              style={{ borderRadius: SHAPE.pill }}
              onPress={nextStep}
            >
              {isLastStep ? "Got it" : "Next"}
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  progressBarBg: {
    height: 3,
    backgroundColor: "#eee",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
