/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Welcome / Landing Screen — JASIRI
 *
 * Design philosophy:
 *  - Warm #FFF9F2 background with a soft sky-blue arch — emotionally safe
 *  - Mascot "Simba" pops in first → title slides up → CTA bounces in
 *  - Floating emoji decorations bob gently (useNativeDriver:true, JS-thread only)
 *  - Single focused CTA — no competing actions
 *  - TTS fires AFTER all elements are visible so child has visual context first
 *  - Full reduced-motion support (WCAG 2.3.3)
 *  - Brand: Poppins-Bold, #FF8A3D orange, #5BB9FF blue, #FFF9F2 bg
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
  AccessibilityInfo,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import PrimaryButton from "../src/components/PrimaryButton";
import {
  Colors,
  Typography,
  FontSize,
  Shadows,
  Animation,
} from "../src/theme/tokens";

const { width, height } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// Floating decoration — each element bobs independently
// Hidden from screen readers, stops when reduced-motion is on
// ─────────────────────────────────────────────────────────────
function FloatingDecor({
  emoji,
  leftPct,
  topPct,
  size,
  floatDelay,
  enterDelay,
  reducedMotion,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const floatLoopRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: Animation.duration.slow,
        useNativeDriver: true,
      }).start();

      floatLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(float, {
            toValue: 1,
            duration: 2400 + floatDelay,
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 0,
            duration: 2400 + floatDelay,
            useNativeDriver: true,
          }),
        ]),
      );
      floatLoopRef.current.start();
    }, enterDelay);

    return () => {
      clearTimeout(timer);
      if (floatLoopRef.current) floatLoopRef.current.stop();
    };
  }, [reducedMotion, enterDelay, float, floatDelay, opacity]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <Animated.Text
      style={[
        styles.floatingDecor,
        {
          left: width * leftPct,
          top: height * topPct,
          fontSize: size,
          opacity,
          transform: reducedMotion ? [] : [{ translateY }],
        },
      ]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {emoji}
    </Animated.Text>
  );
}

const DECORATIONS = [
  {
    emoji: "⭐",
    leftPct: 0.05,
    topPct: 0.07,
    size: 28,
    floatDelay: 0,
    enterDelay: 600,
  },
  {
    emoji: "🌈",
    leftPct: 0.74,
    topPct: 0.05,
    size: 32,
    floatDelay: 400,
    enterDelay: 700,
  },
  {
    emoji: "🎈",
    leftPct: 0.1,
    topPct: 0.26,
    size: 26,
    floatDelay: 200,
    enterDelay: 800,
  },
  {
    emoji: "✨",
    leftPct: 0.82,
    topPct: 0.2,
    size: 22,
    floatDelay: 600,
    enterDelay: 900,
  },
  {
    emoji: "🌸",
    leftPct: 0.6,
    topPct: 0.3,
    size: 30,
    floatDelay: 300,
    enterDelay: 1000,
  },
  {
    emoji: "🦋",
    leftPct: 0.42,
    topPct: 0.09,
    size: 28,
    floatDelay: 500,
    enterDelay: 1100,
  },
  {
    emoji: "🎵",
    leftPct: 0.88,
    topPct: 0.42,
    size: 22,
    floatDelay: 350,
    enterDelay: 950,
  },
];

// ─────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const [reducedMotion, setReducedMotion] = useState(false);
  const navTimerRef = useRef(null);

  // Animation values (JS-thread only — useNativeDriver:true throughout)
  const mascotScale = useRef(new Animated.Value(0)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(32)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Idle animation values — start after entrance completes
  const mascotBob = useRef(new Animated.Value(0)).current;
  const mascotTilt = useRef(new Animated.Value(0)).current;
  const speechBounce = useRef(new Animated.Value(1)).current;
  const tiltDeg = mascotTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducedMotion)
      .catch(() => {
        // Non-fatal — default to animations enabled
      });
  }, []);

  useEffect(() => {
    // Track loops so we can stop them on cleanup
    const loops = [];

    if (reducedMotion) {
      // WCAG 2.3.3 — show all elements instantly, skip animation
      mascotScale.setValue(1);
      mascotOpacity.setValue(1);
      textOpacity.setValue(1);
      textSlide.setValue(0);
      btnOpacity.setValue(1);
      btnScale.setValue(1);
      taglineOpacity.setValue(1);
      Speech.speak(
        "Welcome to Jasiri! Your magical learning world. Tap Let's Go to begin!",
        {
          language: "en",
          pitch: 1.05,
          rate: 0.75,
          onError: (err) => console.warn("[TTS] welcome reduced-motion error:", err),
        },
      );
      return () => loops.forEach((l) => l.stop());
    }

    // Entrance sequence: mascot → title → tagline → button
    Animated.sequence([
      // 1. Mascot pops in with spring
      Animated.parallel([
        Animated.spring(mascotScale, {
          toValue: 1,
          ...Animation.spring.bouncy,
          useNativeDriver: true,
        }),
        Animated.timing(mascotOpacity, {
          toValue: 1,
          duration: Animation.duration.entrance,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title + tagline slide up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: Animation.duration.slow,
          useNativeDriver: true,
        }),
        Animated.spring(textSlide, {
          toValue: 0,
          ...Animation.spring.gentle,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 3. CTA bounces in
      Animated.parallel([
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: Animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(btnScale, {
          toValue: 1,
          ...Animation.spring.snappy,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Speak AFTER all elements visible — child sees context before hearing audio
      Speech.stop();
      Speech.speak(
        "Welcome to Jasiri! Your magical learning world. Tap Let's Go to begin!",
        {
          language: "en",
          pitch: 1.05,
          rate: 0.75,
          onError: (err) => console.warn("[TTS] welcome entrance error:", err),
        },
      );

      // ── Idle animations (Duolingo-style) ─────────────────────────────────

      // 1. Continuous gentle bob — floats up and down
      const bobLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotBob, {
            toValue: -10,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(mascotBob, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      bobLoop.start();

      // 2. Periodic head tilt — Duolingo-style look-around wiggle
      const tiltLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(1800),
          Animated.timing(mascotTilt, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(mascotTilt, {
            toValue: -1,
            duration: 260,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(mascotTilt, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(2800),
        ]),
      );
      tiltLoop.start();

      // 3. Speech bubble pulse — pops to draw attention
      const speechLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(1400),
          Animated.spring(speechBounce, {
            toValue: 1.28,
            speed: 22,
            bounciness: 12,
            useNativeDriver: true,
          }),
          Animated.spring(speechBounce, {
            toValue: 1,
            speed: 22,
            bounciness: 4,
            useNativeDriver: true,
          }),
          Animated.delay(2800),
        ]),
      );
      speechLoop.start();

      loops.push(bobLoop, tiltLoop, speechLoop);
    });

    return () => loops.forEach((l) => l.stop());
  }, [reducedMotion]);

  const handleStart = () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Speech.stop();
    Speech.speak("Let's find your profile!", {
      language: "en",
      pitch: 1.05,
      rate: 0.8,
      onError: (err) => console.warn("[TTS] welcome start error:", err),
    });
    navTimerRef.current = setTimeout(() => router.push("/select-profile"), 350);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* ── Soft blue arch background ── */}
      <View
        style={styles.arch}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/* ── Warm orange accent blob (bottom-left) ── */}
      <View
        style={styles.blobOrange}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/* ── Floating decorations ── */}
      {DECORATIONS.map((d, i) => (
        <FloatingDecor key={i} {...d} reducedMotion={reducedMotion} />
      ))}

      {/* ── Main content ── */}
      <View style={styles.content}>
        {/* Mascot bubble */}
        <Animated.View
          style={[
            styles.mascotWrapper,
            {
              transform: [
                { scale: mascotScale },
                { translateY: mascotBob },
                { rotate: tiltDeg },
              ],
              opacity: mascotOpacity,
            },
          ]}
          accessibilityLabel="Jasiri lion mascot"
          accessibilityRole="image"
        >
          <View style={styles.mascotBubble}>
            <Image
              source={require("../assets/images/mascot-welcome.png")}
              style={styles.mascotImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* Speech bubble hint */}
          <Animated.View
            style={[
              styles.speechBubble,
              { transform: [{ scale: speechBounce }] },
            ]}
          >
            <Text style={styles.speechText}>Habari! 👋</Text>
          </Animated.View>
        </Animated.View>

        {/* Title + tagline */}
        <Animated.View
          style={[
            styles.textBlock,
            { opacity: textOpacity, transform: [{ translateY: textSlide }] },
          ]}
        >
          <Text style={styles.title} accessibilityRole="header">
            Jasiri
          </Text>
          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
            Your magical learning world 🌟
          </Animated.Text>
          <Text style={styles.subtitle}>
            For every curious mind, every brave heart
          </Text>
        </Animated.View>

        {/* Primary CTA */}
        <Animated.View
          style={[
            styles.btnWrapper,
            { opacity: btnOpacity, transform: [{ scale: btnScale }] },
          ]}
        >
          <PrimaryButton
            title="Let's Go! 🚀"
            onPress={handleStart}
            backgroundColor={Colors.orange}
            pressedColor={Colors.orangeDark}
            accessibilityLabel="Let's Go"
            accessibilityHint="Start your learning adventure and choose your profile"
          />
        </Animated.View>

        {/* Guardian sign-in link */}
        <Animated.Text
          style={[styles.versionTag, { opacity: btnOpacity }]}
          accessibilityElementsHidden
        >
          Jasiri v1.0 · Made with ❤️ for every learner
        </Animated.Text>
        <Animated.Text
          style={[styles.poweredByTag, { opacity: btnOpacity }]}
          accessibilityElementsHidden
        >
          powered by Nile Flow
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  arch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.54,
    backgroundColor: Colors.blueLight,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  blobOrange: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.orangeLight,
    opacity: 0.6,
  },
  floatingDecor: {
    position: "absolute",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  mascotWrapper: {
    alignItems: "center",
    marginBottom: 32,
  },
  mascotBubble: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.blueLight,
    ...Shadows.blue,
  },
  mascotImage: {
    width: 108,
    height: 108,
  },
  speechBubble: {
    position: "absolute",
    top: -8,
    right: -12,
    backgroundColor: Colors.orange,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Shadows.orange,
  },
  speechText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  textBlock: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: FontSize["6xl"],
    color: Colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center",
  },
  tagline: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.xl,
    color: Colors.blue,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: Typography.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  btnWrapper: {
    width: "100%",
  },
  versionTag: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 24,
    opacity: 0.6,
    letterSpacing: 0.2,
  },
  poweredByTag: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    opacity: 0.56,
    letterSpacing: 0.2,
  },
});
