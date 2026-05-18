/**
 * Onboarding Screen — JASIRI
 *
 * A 3-step welcoming onboarding for new guardians.
 * Each step introduces one core idea: learning, fun, and safety.
 * Designed to be emotionally warm, low-text, and visually clear.
 *
 * Accessibility:
 *  - progress dots have accessibilityLabel showing current step
 *  - each page is labeled for screen readers
 *  - skip button available on all pages
 *  - reduced motion: skip animations, instant transitions
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import PrimaryButton from "../src/components/PrimaryButton";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
  Animation,
} from "../src/theme/tokens";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// Onboarding pages
// ─────────────────────────────────────────────────────────────
const PAGES = [
  {
    id: "learn",
    emoji: "🎮",
    emojiBg: Colors.blueLight,
    accentColor: Colors.blue,
    title: "Learn by playing",
    body: "Fun games that adapt to your child's pace — no pressure, just joy.",
    badge: "Games · Stories · Art",
    badgeBg: Colors.blueLight,
    badgeText: Colors.blueDark,
  },
  {
    id: "grow",
    emoji: "🌱",
    emojiBg: Colors.greenLight,
    accentColor: Colors.green,
    title: "Grow at their pace",
    body: "Every child is different. Jasiri learns what your child loves and adapts every day.",
    badge: "Personalised · Kind · Safe",
    badgeBg: Colors.greenLight,
    badgeText: Colors.greenDark,
  },
  {
    id: "together",
    emoji: "❤️",
    emojiBg: Colors.lavenderLight,
    accentColor: Colors.lavender,
    title: "We are together",
    body: "Parents and teachers stay connected. Celebrate every win, big and small.",
    badge: "Ubuntu · Together we grow",
    badgeBg: Colors.lavenderLight,
    badgeText: Colors.lavenderDark,
  },
];

// ─────────────────────────────────────────────────────────────
// Single onboarding page
// ─────────────────────────────────────────────────────────────
function OnboardingPage({ page, visible, reducedMotion }) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const emojiScale = useRef(new Animated.Value(visible ? 1 : 0.8)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(visible ? 1 : 0);
      emojiScale.setValue(1);
      return;
    }
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: Animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(emojiScale, {
          toValue: 1,
          ...Animation.spring.bouncy,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: Animation.duration.fast,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, reducedMotion]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.page, { opacity }]}
      accessible
      accessibilityLabel={`${page.title}. ${page.body}`}
    >
      {/* Emoji illustration */}
      <Animated.View
        style={[
          styles.emojiContainer,
          { backgroundColor: page.emojiBg, transform: [{ scale: emojiScale }] },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Text style={styles.emoji}>{page.emoji}</Text>
      </Animated.View>

      {/* Badge pill */}
      <View style={[styles.badge, { backgroundColor: page.badgeBg }]}>
        <Text style={[styles.badgeText, { color: page.badgeText }]}>
          {page.badge}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{page.title}</Text>

      {/* Body */}
      <Text style={styles.body}>{page.body}</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducedMotion)
      .catch(() => {
        // Non-fatal — default to animations enabled
      });
  }, []);

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < PAGES.length - 1) {
      setStep((s) => s + 1);
    } else {
      router.replace("/(auth)/register");
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/register");
  };

  const isLast = step === PAGES.length - 1;
  const current = PAGES[step];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Colored background blob for current step */}
      <View
        style={[styles.blob, { backgroundColor: current.emojiBg }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/* Skip button */}
      {!isLast && (
        <Pressable
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Pages */}
      <View style={styles.pagesArea}>
        {PAGES.map((page, i) => (
          <OnboardingPage
            key={page.id}
            page={page}
            visible={i === step}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        {/* Progress dots */}
        <View
          style={styles.dots}
          accessibilityLabel={`Step ${step + 1} of ${PAGES.length}`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: PAGES.length - 1, now: step }}
        >
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step
                  ? [styles.dotActive, { backgroundColor: current.accentColor }]
                  : styles.dotInactive,
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ))}
        </View>

        {/* CTA */}
        <PrimaryButton
          title={isLast ? "Get Started 🚀" : "Next →"}
          onPress={handleNext}
          backgroundColor={current.accentColor}
          pressedColor={
            isLast
              ? Colors.lavenderDark
              : current.id === "learn"
                ? Colors.blueDark
                : Colors.greenDark
          }
          accessibilityLabel={isLast ? "Get started" : "Next step"}
          accessibilityHint={
            isLast ? "Create your guardian account" : "Go to the next step"
          }
        />

        {/* Already have account link */}
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={styles.loginLink}
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Sign in"
        >
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text
              style={[styles.loginTextBold, { color: current.accentColor }]}
            >
              Sign in
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  blob: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: Radius.full,
    opacity: 0.5,
  },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  skipText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  pagesArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  page: {
    width: "100%",
    alignItems: "center",
  },
  emojiContainer: {
    width: 160,
    height: 160,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    ...Shadows.md,
  },
  emoji: {
    fontSize: 80,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: FontSize["4xl"],
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 42,
  },
  body: {
    fontFamily: Typography.regular,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 32,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  loginLink: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  loginText: {
    fontFamily: Typography.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  loginTextBold: {
    fontFamily: Typography.bold,
  },
});
