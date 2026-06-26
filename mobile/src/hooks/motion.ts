/**
 * Reanimated 3 spring helpers that use our motion tokens.
 * Every animated surface in the app should use these for consistent feel.
 */
import { withSpring, withTiming, type WithSpringConfig, type WithTimingConfig } from "react-native-reanimated";
import { MOTION } from "../theme/tokens";

export function springEntry() {
  return withSpring(1, MOTION.entry as WithSpringConfig);
}
export function springExit() {
  return withSpring(0, MOTION.exit as WithSpringConfig);
}
export function springTap() {
  return withSpring(0.97, MOTION.tap as WithSpringConfig);
}
export function springSheet() {
  return withSpring(1, MOTION.sheet as WithSpringConfig);
}
export function timingShort() {
  return withTiming(1, { duration: MOTION.duration.short } as WithTimingConfig);
}
export function timingMedium() {
  return withTiming(1, { duration: MOTION.duration.medium } as WithTimingConfig);
}
export function timingLong() {
  return withTiming(1, { duration: MOTION.duration.long } as WithTimingConfig);
}
