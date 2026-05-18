/* eslint-disable react/no-unescaped-entities */
/**
 * Therapist Dashboard Screen
 *
 * Design philosophy:
 *  - Blue accent — calm, clinical, trustworthy.
 *  - Tracks therapy sessions and developmental milestones.
 *  - Milestone bars replace generic skill bars (Motor, Communication,
 *    Social, Cognition) — the language used in therapy contexts.
 *  - "Switch to Child View" lets therapist hand device to a client.
 *  - All card content is real-data-ready: swap DEFAULT_* constants
 *    with store/hook calls once backend is wired up.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import useChildStore from "../src/store/useChildStore";
import useAuthStore from "../src/store/useAuthStore";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

// ─────────────────────────────────────────────────────────────
// Default fallback data
// ─────────────────────────────────────────────────────────────
const DEFAULT_MILESTONES = [
  { label: "Motor Skills", pct: 0, color: Colors.blue },
  { label: "Communication", pct: 0, color: Colors.green },
  { label: "Social Skills", pct: 0, color: Colors.lavender },
  { label: "Cognition", pct: 0, color: Colors.yellow },
];

const DEFAULT_SESSIONS = [];

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, sub, color, enterDelay }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, enterDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCardWrapper,
        { opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <View
        style={[
          styles.statCardInner,
          { backgroundColor: color + "18", borderColor: color + "45" },
        ]}
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {sub ? <Text style={[styles.statSub, { color }]}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Milestone bar — JS-thread width animation
// ─────────────────────────────────────────────────────────────
function MilestoneBar({ milestone, enterDelay }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: milestone.pct / 100,
        duration: 820,
        useNativeDriver: false,
      }).start();
    }, enterDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const interpolatedWidth = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={styles.skillBarWrapper}
      accessibilityLabel={`${milestone.label} milestone: ${milestone.pct} percent`}
    >
      <View style={styles.skillBarRow}>
        <Text style={styles.skillLabel}>{milestone.label}</Text>
        <Text style={[styles.skillPct, { color: milestone.color }]}>
          {milestone.pct}%
        </Text>
      </View>
      <View style={styles.skillTrack}>
        <Animated.View
          style={[
            styles.skillFill,
            { width: interpolatedWidth, backgroundColor: milestone.color },
          ]}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Session row
// ─────────────────────────────────────────────────────────────
function SessionRow({ activity, index, totalCount }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(
      () => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }).start();
      },
      500 + index * 120,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLast = index === totalCount - 1;

  return (
    <Animated.View
      style={[
        styles.activityRow,
        { opacity },
        !isLast && styles.activityRowBorder,
      ]}
      accessibilityLabel={`${activity.title}: ${activity.score}, ${activity.minutes} minutes`}
    >
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: activity.color + "28" },
        ]}
        accessible={false}
        importantForAccessibility="no"
      >
        <Text style={styles.activityIconEmoji}>{activity.emoji}</Text>
      </View>
      <View style={styles.activityMeta}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityTime}>{activity.minutes} min session</Text>
      </View>
      <View style={styles.scorePill}>
        <Text style={styles.scoreText}>{activity.score}</Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Card shell with delayed fade-in
// ─────────────────────────────────────────────────────────────
function Card({ children, enterDelay }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, enterDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY: slideY }] }]}
    >
      {children}
    </Animated.View>
  );
}

function CardHeading({ emoji, title }) {
  return (
    <Text style={styles.cardHeading} accessibilityRole="header">
      {emoji} {title}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
export default function TherapistDashboardScreen() {
  const router = useRouter();
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;

  const user = useAuthStore((s) => s.user);
  const selectedChild = useChildStore((s) => s.selectedChild);
  const storeProgress = useChildStore((s) => s.progress);
  const isLoading = useChildStore((s) => s.isLoading);

  const therapistName = user?.name?.split(" ")[0] ?? "Therapist";

  const backendProgress = storeProgress ?? {};
  const activeClients = backendProgress.activeClients ?? 0;
  const sessionsToday = backendProgress.sessionsToday ?? 0;
  const milestonesHit = backendProgress.milestonesHit ?? 0;
  const weeklyGain = backendProgress.weeklyGain ?? "+0%";

  const milestones = backendProgress.skills?.length
    ? backendProgress.skills.map((s, i) => ({
        label: s.name ?? s.label ?? `Area ${i + 1}`,
        pct: Math.round(s.score ?? s.pct ?? 0),
        color: DEFAULT_MILESTONES[i % DEFAULT_MILESTONES.length].color,
      }))
    : DEFAULT_MILESTONES;

  const recentSessions = backendProgress.recentActivities?.length
    ? backendProgress.recentActivities
    : DEFAULT_SESSIONS;

  useEffect(() => {
    if (selectedChild) {
      useChildStore.getState().selectChild(selectedChild);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChild?.$id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchToChild = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/child-home");
  };

  const QUICK_ACTIONS = [
    {
      label: "Session Notes",
      emoji: "📝",
      color: Colors.blue,
      light: Colors.blueLight,
      route: "/goals",
    },
    {
      label: "Reports",
      emoji: "📊",
      color: Colors.lavender,
      light: Colors.lavenderLight,
      route: "/reports",
    },
    {
      label: "Settings",
      emoji: "⚙️",
      color: Colors.green,
      light: Colors.greenLight,
      route: "/settings",
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>Therapist Dashboard</Text>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {therapistName}'s Sessions 🩺
            </Text>
          </View>

          {/* Switch to child view */}
          <Pressable
            onPress={switchToChild}
            accessibilityRole="button"
            accessibilityLabel="Switch to child view"
            accessibilityHint="Returns to the child-facing learning screen"
            style={({ pressed }) => [
              styles.switchBtn,
              pressed && styles.switchBtnPressed,
            ]}
          >
            <Text style={styles.switchBtnEmoji}>🌟</Text>
            <Text style={styles.switchBtnLabel}>Child View</Text>
          </Pressable>
        </Animated.View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow} accessibilityLabel="Session statistics">
          <StatCard
            emoji="🧒"
            label="Clients"
            value={activeClients}
            color={Colors.blue}
            enterDelay={180}
          />
          <StatCard
            emoji="🗓️"
            label="Sessions"
            value={sessionsToday}
            sub="Today"
            color={Colors.lavender}
            enterDelay={280}
          />
          <StatCard
            emoji="🏅"
            label="Milestones"
            value={milestonesHit}
            color={Colors.green}
            enterDelay={380}
          />
        </View>

        {/* ── Today's sessions ── */}
        <Card enterDelay={340}>
          <CardHeading emoji="🗓️" title="Today's Sessions" />
          {isLoading ? (
            <ActivityIndicator color={Colors.blue} style={styles.loader} />
          ) : recentSessions.length === 0 ? (
            <Text style={styles.emptyText}>
              No sessions recorded today. Start a therapy session!
            </Text>
          ) : (
            recentSessions.map((session, i) => (
              <SessionRow
                key={session.title ?? i}
                activity={session}
                index={i}
                totalCount={recentSessions.length}
              />
            ))
          )}
        </Card>

        {/* ── Milestone progress ── */}
        <Card enterDelay={480}>
          <CardHeading emoji="📈" title="Milestone Progress" />
          {milestones.map((milestone, i) => (
            <MilestoneBar
              key={milestone.label}
              milestone={milestone}
              enterDelay={600 + i * 110}
            />
          ))}
        </Card>

        {/* ── Encouragement card ── */}
        <Card enterDelay={620}>
          <View style={styles.encourageRow}>
            <Text style={styles.encourageEmoji}>🌿</Text>
            <View style={styles.encourageBody}>
              <Text style={styles.encourageTitle}>
                Wonderful work, {therapistName}!
              </Text>
              <Text style={styles.encourageText}>
                Your clients' milestones are up {weeklyGain} this week. Your
                therapy sessions create real, lasting change.
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Quick actions ── */}
        <Text style={styles.quickActionsHeading} accessibilityRole="header">
          Quick Actions
        </Text>

        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action, i) => (
            <Pressable
              key={action.label}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push(action.route);
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: pressed ? action.light : action.light + "88",
                  borderColor: action.color + "55",
                },
                i === 1 && styles.quickActionBtnMiddle,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 52,
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? 58 : 40,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
  },
  headerEyebrow: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xl"],
    color: Colors.textPrimary,
    lineHeight: 32,
  },

  // ── Switch to child ──
  switchBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    marginTop: 4,
    ...Shadows.blue,
  },
  switchBtnPressed: {
    backgroundColor: Colors.blueDark,
  },
  switchBtnEmoji: {
    fontSize: FontSize.base,
  },
  switchBtnLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.textOnDark,
    marginLeft: 6,
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCardInner: {
    borderRadius: Radius.xl,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  statEmoji: {
    fontSize: FontSize["3xl"],
    marginBottom: 5,
  },
  statValue: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xl"],
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.semibold,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  statSub: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xs"],
    marginTop: 3,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius["2xl"],
    padding: 20,
    marginBottom: 18,
    ...Shadows.sm,
  },
  cardHeading: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 16,
  },

  // ── Loader / empty ──
  loader: {
    marginVertical: 12,
  },
  emptyText: {
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 12,
  },

  // ── Milestone bar ──
  skillBarWrapper: {
    marginBottom: 16,
  },
  skillBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  skillLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  skillPct: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
  },
  skillTrack: {
    height: 10,
    backgroundColor: Colors.divider,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  skillFill: {
    height: "100%",
    borderRadius: Radius.full,
  },

  // ── Session row ──
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  activityIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  activityIconEmoji: {
    fontSize: FontSize.xl,
  },
  activityMeta: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  activityTime: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  scorePill: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.blueDark,
  },

  // ── Encouragement card ──
  encourageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  encourageEmoji: {
    fontSize: FontSize["5xl"],
    marginRight: 16,
  },
  encourageBody: {
    flex: 1,
  },
  encourageTitle: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.blueDark,
    marginBottom: 5,
  },
  encourageText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.blue,
    lineHeight: 20,
  },

  // ── Quick actions ──
  quickActionsHeading: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 14,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    minHeight: 88,
    justifyContent: "center",
  },
  quickActionBtnMiddle: {
    marginHorizontal: 8,
  },
  quickActionEmoji: {
    fontSize: FontSize["2xl"],
    marginBottom: 6,
  },
  quickActionLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
});
