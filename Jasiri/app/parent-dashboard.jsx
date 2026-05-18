/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
/**
 * Parent Dashboard Screen
 *
 * Design philosophy:
 *  - Calm and trustworthy — warm off-white background, JASIRI brand palette.
 *    NOT a clinical dashboard; it should feel like opening a
 *    warm progress report from a caring teacher.
 *  - Data is surfaced in plain language ("5 day streak 🔥"),
 *    not as raw numbers or charts that require interpretation.
 *  - Skill bars animate on entry (JS thread, width-based) but
 *    only after other content is visible so the eye follows one
 *    thing at a time.
 *  - "Switch to Child View" is prominent (orange CTA) so the parent
 *    can quickly hand the device back without navigating menus.
 *  - All card content is real-data-ready: swap the CHILD_DATA
 *    const with a context/hook call once backend is wired up.
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
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import useChildStore from "../src/store/useChildStore";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// Default fallback data (used when backend progress is unavailable)
// ─────────────────────────────────────────────────────────────
const DEFAULT_SKILLS = [
  { label: "Memory", pct: 0, color: Colors.blue },
  { label: "Language", pct: 0, color: Colors.green },
  { label: "Motor Skills", pct: 0, color: Colors.yellow },
  { label: "Creativity", pct: 0, color: Colors.lavender },
];

const DEFAULT_ACTIVITIES = [];

// ─────────────────────────────────────────────────────────────
// Stat card – small rounded tile
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
// Skill progress bar – JS-thread width animation
// ─────────────────────────────────────────────────────────────
function SkillBar({ skill, enterDelay }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: skill.pct / 100,
        duration: 820,
        useNativeDriver: false, // width is a layout prop – JS thread required
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
      accessibilityLabel={`${skill.label} skill: ${skill.pct} percent`}
    >
      <View style={styles.skillBarRow}>
        <Text style={styles.skillLabel}>{skill.label}</Text>
        <Text style={[styles.skillPct, { color: skill.color }]}>
          {skill.pct}%
        </Text>
      </View>
      <View style={styles.skillTrack}>
        <Animated.View
          style={[
            styles.skillFill,
            { width: interpolatedWidth, backgroundColor: skill.color },
          ]}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Recent activity row
// ─────────────────────────────────────────────────────────────
function ActivityRow({ activity, index, totalCount }) {
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
      {/* Icon circle — hidden from SR, parent Animated.View has the full label */}
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

      {/* Name + time */}
      <View style={styles.activityMeta}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityTime}>{activity.minutes} min today</Text>
      </View>

      {/* Score pill */}
      <View style={styles.scorePill}>
        <Text style={styles.scoreText}>{activity.score}</Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable card shell with delayed fade-in
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
export default function ParentDashboardScreen() {
  const router = useRouter();
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;

  const selectedChild = useChildStore((s) => s.selectedChild);
  const storeProgress = useChildStore((s) => s.progress);
  const loadProgress = useChildStore((s) => s.selectChild);
  const isLoading = useChildStore((s) => s.isLoading);

  // Derive display data from store or fall back to defaults
  const childName = selectedChild?.name ?? "Your learner";
  const childAge = selectedChild?.age ?? null;

  const backendProgress = storeProgress ?? {};
  const todayMinutes = backendProgress.todayMinutes ?? 0;
  const totalStars = backendProgress.totalStars ?? 0;
  const streak = backendProgress.streak ?? 0;
  const weeklyGain = backendProgress.weeklyGain ?? "+0%";

  const skills = backendProgress.skills?.length
    ? backendProgress.skills.map((s, i) => ({
        label: s.name ?? s.label ?? `Skill ${i + 1}`,
        pct: Math.round(s.score ?? s.pct ?? 0),
        color: DEFAULT_SKILLS[i % DEFAULT_SKILLS.length].color,
      }))
    : DEFAULT_SKILLS;

  const recentActivities = backendProgress.recentActivities?.length
    ? backendProgress.recentActivities
    : DEFAULT_ACTIVITIES;

  useEffect(() => {
    // Refresh progress when child is known
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

  // Quick actions palette
  const QUICK_ACTIONS = [
    {
      label: "Set Goals",
      emoji: "🎯",
      color: Colors.blue,
      light: Colors.blueLight,
      route: "/goals",
    },
    {
      label: "Reports",
      emoji: "📊",
      color: Colors.green,
      light: Colors.greenLight,
      route: "/reports",
    },
    {
      label: "Settings",
      emoji: "⚙️",
      color: Colors.lavender,
      light: Colors.lavenderLight,
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
            <Text style={styles.headerEyebrow}>Parent Dashboard</Text>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {childName}'s Progress 📊
            </Text>
          </View>

          {/* Switch to child CTA – brand orange */}
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
        <View style={styles.statsRow} accessibilityLabel="Summary statistics">
          <StatCard
            emoji="⭐"
            label="Total Stars"
            value={totalStars}
            color={Colors.yellow}
            enterDelay={180}
          />
          <StatCard
            emoji="🔥"
            label="Day Streak"
            value={`${streak}d`}
            sub="Keep going!"
            color={Colors.orange}
            enterDelay={280}
          />
          <StatCard
            emoji="⏱️"
            label="Today"
            value={`${todayMinutes}m`}
            color={Colors.blue}
            enterDelay={380}
          />
        </View>

        {/* ── Today's learning ── */}
        <Card enterDelay={340}>
          <CardHeading emoji="📅" title="Today's Learning" />
          {isLoading ? (
            <ActivityIndicator color={Colors.blue} style={styles.loader} />
          ) : recentActivities.length === 0 ? (
            <Text style={styles.emptyText}>
              No activities recorded yet. Start a game!
            </Text>
          ) : (
            recentActivities.map((act, i) => (
              <ActivityRow
                key={act.title ?? i}
                activity={act}
                index={i}
                totalCount={recentActivities.length}
              />
            ))
          )}
        </Card>

        {/* ── Skill progress ── */}
        <Card enterDelay={480}>
          <CardHeading emoji="📈" title="Skill Progress" />
          {skills.map((skill, i) => (
            <SkillBar
              key={skill.label}
              skill={skill}
              enterDelay={600 + i * 110}
            />
          ))}
        </Card>

        {/* ── Encouragement card ── */}
        <Card enterDelay={620}>
          <View style={styles.encourageRow}>
            <Text style={styles.encourageEmoji}>🌱</Text>
            <View style={styles.encourageBody}>
              <Text style={styles.encourageTitle}>
                {childName} is thriving!
              </Text>
              <Text style={styles.encourageText}>
                {streak}-day learning streak. Skills up {weeklyGain} this week.
                Wonderful progress!
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
  // ── Root ──
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

  // ── Switch to child button ──
  switchBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    marginTop: 4,
    ...Shadows.orange,
  },
  switchBtnPressed: {
    backgroundColor: Colors.orangeDark,
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

  // ── Skill bar ──
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

  // ── Activity row ──
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
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.greenDark,
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
    color: Colors.greenDark,
    marginBottom: 5,
  },
  encourageText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.green,
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
