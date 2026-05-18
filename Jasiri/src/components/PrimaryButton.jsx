/**
 * PrimaryButton — Reusable accessible CTA button for JASIRI
 *
 * Self-contained: no ThemeProvider dependency.
 * Designed for children with Down syndrome — large touch target (min 56dp),
 * Poppins-Bold typography, haptic feedback, smooth animated press state.
 *
 * Uses useState for pressed tracking instead of Pressable function-style style
 * to avoid NativeWind v4 interference with dynamic backgroundColor.
 *
 * @param {{ title: string, onPress: Function, loading?: boolean,
 *   disabled?: boolean, backgroundColor?: string,
 *   pressedColor?: string, textColor?: string,
 *   style?: object, accessibilityLabel?: string,
 *   accessibilityHint?: string }} props
 */

import React, { useRef, useCallback, useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors, Typography, FontSize } from "../theme/tokens";

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  backgroundColor = Colors.orange,
  pressedColor = Colors.orangeDark,
  textColor = "#FFFFFF",
  style = {},
  accessibilityLabel,
  accessibilityHint,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const animateIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    setPressed(true);
    animateIn();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [disabled, loading, animateIn]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    animateOut();
  }, [animateOut]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    onPress && onPress();
  }, [disabled, loading, onPress]);

  const isInactive = disabled || loading;

  // Compute background — resolved eagerly so React Native gets a plain value
  const resolvedBg = isInactive
    ? "#B0BEC5"
    : pressed
      ? pressedColor
      : backgroundColor;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInactive}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isInactive, busy: loading }}
        style={[
          styles.button,
          {
            backgroundColor: resolvedBg,
            shadowColor: isInactive ? "transparent" : backgroundColor,
            elevation: isInactive ? 0 : 8,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    // WCAG 2.5.5 — minimum 56 dp touch target
    minHeight: 56,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    // Shadow base — color overridden dynamically above
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  label: {
    fontFamily: "Poppins-Bold",
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
