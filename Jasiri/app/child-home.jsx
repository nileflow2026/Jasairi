/* eslint-disable react/no-unescaped-entities */
/**
 * Child Home – "My Learning World"
 *
 * Design philosophy:
 *  - Feels like a world map, not a dashboard. Activity cards are "islands"
 *    the child can visit – each with its own personality and color.
 *  - 2-column grid keeps tapping area large and avoids small text.
 *  - Each card has a gentle float animation that starts AFTER the entrance
 *    so the screen never feels chaotic on entry.
 *  - Stars counter in the header gives a reward signal at a glance.
 *  - Daily encouragement strip at the bottom reframes progress positively.
 *  - Small "Parent" FAB bottom-right lets caregivers switch without the
 *    child needing to navigate menus.
 *  - All animations: useNativeDriver:true (transforms + opacity only).
 *  - Width-based animations (progress bars) deferred until parent dashboard.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
  AccessibilityInfo,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import useChildStore from "../src/store/useChildStore";
import useAuthStore from "../src/store/useAuthStore";
import { gameService } from "../src/services/gameService";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// Activity catalogue — bgColor and accentColor mapped to brand palette
// ─────────────────────────────────────────────────────────────
const ACTIVITIES = [
  {
    id: "games",
    emoji: "🎮",
    title: "Play Games",
    subtitle: "Fun challenges",
    accentColor: Colors.blue,
    bgColor: Colors.blueLight,
    route: "/games",
    speech: "Let's play some fun games!",
    stars: 5,
  },
  {
    id: "stories",
    emoji: "📚",
    title: "My Stories",
    subtitle: "Listen & read",
    accentColor: Colors.green,
    bgColor: Colors.greenLight,
    route: "/stories",
    speech: "Time for a story!",
    stars: 3,
  },
  {
    id: "music",
    emoji: "🎵",
    title: "Music Time",
    subtitle: "Sing & dance",
    accentColor: Colors.yellow,
    bgColor: Colors.yellowLight,
    route: "/music",
    speech: "Let's make some music!",
    stars: 4,
  },
  {
    id: "art",
    emoji: "🎨",
    title: "Draw & Color",
    subtitle: "Be creative",
    accentColor: Colors.lavender,
    bgColor: Colors.lavenderLight,
    route: "/games",
    speech: "Let's create some art!",
    stars: 2,
  },
  {
    id: "numbers",
    emoji: "🔢",
    title: "Learn Numbers",
    subtitle: "Count & match",
    accentColor: Colors.lavenderDark,
    bgColor: Colors.lavenderLight,
    route: "/games",
    speech: "Let's learn numbers together!",
    stars: 3,
  },
  {
    id: "words",
    emoji: "🔤",
    title: "New Words",
    subtitle: "Spell & speak",
    accentColor: Colors.blueDark,
    bgColor: Colors.blueLight,
    route: "/games",
    speech: "Let's learn some new words!",
    stars: 1,
  },
];

// ─────────────────────────────────────────────────────────────
// Short celebration phrases – one is spoken before activity speech
// ─────────────────────────────────────────────────────────────
const CELEBRATION_PHRASES = [
  "Let's go!",
  "Great choice!",
  "Adventure time!",
  "Here we go!",
  "Woohoo!",
  "Amazing!",
];

// ─────────────────────────────────────────────────────────────
// Star badge strip inside each card
// ─────────────────────────────────────────────────────────────
function StarStrip({ count }) {
  const clamped = Math.min(count, 5);
  return (
    <View
      style={styles.starStrip}
      accessibilityLabel={`${clamped} stars earned`}
    >
      {Array.from({ length: clamped }).map((_, i) => (
        // Hidden from screen reader – parent View has the combined label
        <Text
          key={i}
          style={styles.starEmoji}
          accessible={false}
          importantForAccessibility="no"
        >
          ⭐
        </Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity card – entrance spring + persistent float loop
// ─────────────────────────────────────────────────────────────
const CARD_WIDTH = (width - 48 - 12) / 2; // 2 columns, 24px side padding, 12px gap

const ActivityCard = React.memo(function ActivityCard({
  activity,
  enterDelay,
  onPress,
  reducedMotion,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const float = useRef(new Animated.Value(0)).current;
  const tapBounce = useRef(new Animated.Value(1)).current; // reward pop
  // Keep a ref to the running float loop so we can stop it on cleanup
  const floatLoopRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) {
      // WCAG 2.3.3 – instantly show card, no float loop
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Gentle independent float – stagger by enterDelay so cards don't sync
        floatLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(float, {
              toValue: 1,
              duration: 2000 + enterDelay * 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(float, {
              toValue: 0,
              duration: 2000 + enterDelay * 0.8,
              useNativeDriver: true,
            }),
          ]),
        );
        floatLoopRef.current.start();
      });
    }, enterDelay);
    return () => {
      clearTimeout(timer);
      // Stop the infinite loop when the component unmounts or screen loses focus
      if (floatLoopRef.current) {
        floatLoopRef.current.stop();
      }
    };
    // Animated.Value refs are stable — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, enterDelay]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  // combinedScale computed once via useRef — avoids leaking Animated nodes each render
  const combinedScale = useRef(Animated.multiply(scale, tapBounce)).current;

  const handlePress = useCallback(() => {
    if (!reducedMotion) {
      // Celebratory pop-up: card bounces past natural size then settles
      Animated.sequence([
        Animated.timing(tapBounce, {
          toValue: 1.12,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(tapBounce, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Reward haptic: firm tap + soft echo = satisfying "ta-ta" feel
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        90,
      );
    }
    onPress(activity);
  }, [activity, onPress, reducedMotion, tapBounce]);

  return (
    <Animated.View
      style={[
        styles.cardAnimWrapper,
        { opacity, transform: [{ scale: combinedScale }, { translateY }] },
      ]}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${activity.title}, ${activity.subtitle}`}
        accessibilityHint={activity.speech}
        style={({ pressed }) => [
          styles.activityCard,
          {
            backgroundColor: pressed ? activity.accentColor : Colors.surface,
            borderColor: activity.accentColor + "55",
            shadowColor: activity.accentColor,
            shadowOpacity: pressed ? 0.55 : 0.22,
            elevation: pressed ? 12 : 4,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        {({ pressed }) => (
          // Wrapped so screen reader focuses the Pressable as one unit
          <View
            accessible={false}
            importantForAccessibility="no"
            style={styles.cardInner}
          >
            {/* Icon bubble */}
            <View
              style={[styles.iconBubble, { backgroundColor: activity.bgColor }]}
            >
              <Text style={styles.cardEmoji}>{activity.emoji}</Text>
            </View>

            <Text style={styles.cardTitle} numberOfLines={1}>
              {activity.title}
            </Text>
            {/* WCAG 1.4.3: subtitle uses dark color on press so contrast stays ≥4.5:1 */}
            <Text
              style={[
                styles.cardSubtitle,
                {
                  color: pressed ? "rgba(13,27,42,0.88)" : Colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {activity.subtitle}
            </Text>

            <StarStrip count={activity.stars} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────
// Greeting header – warm blue panel with time-aware message
// ─────────────────────────────────────────────────────────────
function GreetingHeader({ name, totalStars, reducedMotion }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(-16)).current;
  const starPulse = useRef(new Animated.Value(1)).current; // single heartbeat after entry

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Single heartbeat on stars badge – celebrates the screen loading
      if (!reducedMotion) {
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(starPulse, {
              toValue: 1.22,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.spring(starPulse, {
              toValue: 1,
              friction: 3,
              tension: 80,
              useNativeDriver: true,
            }),
          ]).start();
        }, 350);
      }
    });
    // Animated.Value refs (opacity, slideY) are stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.headerAnimWrapper,
        { opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <View style={styles.headerPanel}>
        <View style={styles.headerRow}>
          {/* Text block */}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerGreeting}>{greeting}!</Text>
            <Text style={styles.headerName} accessibilityRole="header">
              Hello, {name}! 👋
            </Text>
            <Text style={styles.headerSub}>
              What do you want to explore today?
            </Text>
          </View>

          {/* Stars counter badge – pulses once after header enters */}
          <Animated.View style={{ transform: [{ scale: starPulse }] }}>
            <View
              style={styles.starsBadge}
              accessibilityLabel={`${totalStars} stars earned`}
            >
              {/* Inner elements hidden from SR – parent View has the combined label */}
              <Text
                style={styles.starsBadgeEmoji}
                accessible={false}
                importantForAccessibility="no"
              >
                ⭐
              </Text>
              <Text
                style={styles.starsBadgeCount}
                accessible={false}
                importantForAccessibility="no"
              >
                {totalStars}
              </Text>
              <Text
                style={styles.starsBadgeLabel}
                accessible={false}
                importantForAccessibility="no"
              >
                stars!
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Daily encouragement strip
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  { emoji: "🌟", msg: "You're doing amazing! Every day you learn, you grow." },
  { emoji: "🏆", msg: "You completed 3 activities yesterday. Keep it up!" },
  {
    emoji: "🌈",
    msg: "You're braver than you believe and smarter than you think!",
  },
];

function EncouragementStrip() {
  const pick = ENCOURAGEMENTS[new Date().getDay() % ENCOURAGEMENTS.length];
  const opacity = useRef(new Animated.Value(0)).current;
  const stripScale = useRef(new Animated.Value(0.94)).current; // spring entry

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(stripScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.encourageAnimWrapper,
        { opacity, transform: [{ scale: stripScale }] },
      ]}
    >
      <View style={styles.encourageStrip} accessibilityLabel={pick.msg}>
        {/* Children hidden from SR – parent View label covers all content */}
        <Text
          style={styles.encourageEmoji}
          accessible={false}
          importantForAccessibility="no"
        >
          {pick.emoji}
        </Text>
        <View
          style={styles.encourageTextBlock}
          accessible={false}
          importantForAccessibility="no"
        >
          <Text style={styles.encourageTitle}>You're doing amazing!</Text>
          <Text style={styles.encourageBody}>{pick.msg}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
export default function ChildHomeScreen() {
  const router = useRouter();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [backendStars, setBackendStars] = useState(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Wire to child store — prefer store data over hardcoded placeholders
  const selectedChild = useChildStore((s) => s.selectedChild);
  const progress = useChildStore((s) => s.progress);
  const childName = selectedChild?.name ?? "Champion";
  const fallbackStars = Number(progress?.totalStars);
  const totalStars =
    backendStars !== null
      ? backendStars
      : Number.isFinite(fallbackStars)
        ? fallbackStars
        : 0;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducedMotion)
      .catch(() => {
        // Non-fatal — default to animations enabled
      });
  }, []);

  useEffect(() => {
    const selectedChildId = selectedChild?.$id;
    if (!isAuthenticated || !selectedChildId) {
      setBackendStars(null);
      return;
    }

    gameService
      .listSessions({ childId: selectedChildId, status: "completed" })
      .then((sessions) => {
        if (!Array.isArray(sessions)) return;
        setBackendStars(sessions.length);
      })
      .catch(() => {
        // Keep fallback stars from cached child profile if backend is unavailable.
        setBackendStars(null);
      });
  }, [isAuthenticated, selectedChild?.$id]);

  useEffect(() => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    const timer = setTimeout(() => {
      Speech.stop();
      Speech.speak(
        `${greeting}, ${childName}! You have ${totalStars} stars. What do you want to explore today?`,
        {
          language: "en",
          pitch: 1.1,
          rate: 0.74,
          onError: (err) => console.warn("[TTS] child-home greeting error:", err),
        },
      );
    }, 800);
    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, [childName, totalStars]);

  const navTimerRef = useRef(null);

  // Clean up pending navigation timer on unmount to prevent stale route pushes
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const handleActivityPress = useCallback(
    (activity) => {
      // Cancel any pending navigation from a previous quick tap
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      const celebration =
        CELEBRATION_PHRASES[
          Math.floor(Math.random() * CELEBRATION_PHRASES.length)
        ];
      // Stop any in-progress speech before starting new
      Speech.stop();
      Speech.speak(`${celebration} ${activity.speech}`, {
        language: "en",
        pitch: 1.1,
        rate: 0.82,
        onError: (err) => console.warn("[TTS] activity speech error:", err),
      });
      // Short delay for haptic+visual bounce to settle before route push
      navTimerRef.current = setTimeout(() => router.push(activity.route), 300);
    },
    [router],
  );

  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const fabBreath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(sectionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slow breathing pulse on FAB – draws caregiver's eye without distracting child
  const fabBreathLoopRef = useRef(null);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => {
      fabBreathLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(fabBreath, {
            toValue: 1.1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(fabBreath, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      );
      fabBreathLoopRef.current.start();
    }, 2500);
    return () => {
      clearTimeout(timer);
      if (fabBreathLoopRef.current) fabBreathLoopRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.blueLight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <GreetingHeader
          name={childName}
          totalStars={totalStars}
          reducedMotion={reducedMotion}
        />

        {/* ── Section heading ── */}
        <Animated.Text
          style={[styles.sectionHeading, { opacity: sectionOpacity }]}
          accessibilityRole="header"
        >
          Choose your adventure ✨
        </Animated.Text>

        {/* ── Activity grid ── */}
        <View style={styles.grid}>
          {ACTIVITIES.map((activity, i) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              enterDelay={120 + i * 90}
              onPress={handleActivityPress}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>

        {/* ── Encouragement ── */}
        <EncouragementStrip />
      </ScrollView>

      {/* ── Floating parent switch FAB ── */}
      {/* FAB breathes slowly to catch the caregiver's eye */}
      <Animated.View
        style={[styles.fabWrapper, { transform: [{ scale: fabBreath }] }]}
      >
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push("/parent-dashboard");
          }}
          accessibilityRole="button"
          accessibilityLabel="Parent dashboard"
          accessibilityHint="Switch to the parent view"
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: pressed ? Colors.orangeDark : Colors.orange,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <Text style={styles.fabEmoji}>👨‍👩‍👧</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },

  // ── Greeting header ──
  headerAnimWrapper: {
    marginBottom: 24,
  },
  headerPanel: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius["3xl"],
    padding: 22,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    marginHorizontal: -24,
    paddingHorizontal: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerGreeting: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.blueDark,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerName: {
    fontFamily: Typography.bold,
    fontSize: FontSize["3xl"],
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  headerSub: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.blueDark,
    marginTop: 6,
    lineHeight: 20,
  },
  starsBadge: {
    backgroundColor: Colors.yellowLight,
    borderRadius: Radius.xl,
    padding: 14,
    alignItems: "center",
    minWidth: 76,
    marginLeft: 16,
    ...Shadows.sm,
    shadowColor: Colors.yellow,
    shadowOpacity: 0.45,
  },
  starsBadgeEmoji: {
    fontSize: 28,
  },
  starsBadgeCount: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xl"],
    color: Colors.yellow,
    marginTop: 2,
  },
  starsBadgeLabel: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.yellow,
  },

  // ── Section heading ──
  sectionHeading: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    marginBottom: 16,
  },

  // ── Activity grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardAnimWrapper: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  activityCard: {
    borderRadius: Radius["3xl"],
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    borderWidth: 2,
    minHeight: 152,
    justifyContent: "center",
  },
  cardInner: {
    alignItems: "center",
    width: "100%",
  },
  iconBubble: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 34,
  },
  cardTitle: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs + 1,
    textAlign: "center",
    marginBottom: 10,
  },

  // ── Star strip ──
  starStrip: {
    flexDirection: "row",
    backgroundColor: Colors.yellowLight,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "center",
  },
  starEmoji: {
    fontSize: 16,
  },

  // ── Encouragement strip ──
  encourageAnimWrapper: {
    marginTop: 8,
  },
  encourageStrip: {
    backgroundColor: Colors.orangeLight,
    borderRadius: Radius.xl,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.orange + "45",
  },
  encourageEmoji: {
    fontSize: 38,
    marginRight: 16,
  },
  encourageTextBlock: {
    flex: 1,
  },
  encourageTitle: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.base,
    color: Colors.orangeDark,
    marginBottom: 4,
  },
  encourageBody: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs + 1,
    color: Colors.orangeDark,
    lineHeight: 20,
  },

  // ── FAB ──
  fabWrapper: {
    position: "absolute",
    bottom: 32,
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.orange,
  },
  fabEmoji: {
    fontSize: 26,
  },
});
