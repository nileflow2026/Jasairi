/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Reports Screen — Parent Dashboard
 *
 * Displays a child's learning progress in plain, actionable language:
 *  - Period selector (7 / 30 / All days)
 *  - Key stat cards (sessions, avg score, streak)
 *  - Skill breakdown bars (from progress endpoint)
 *  - AI performance analysis summary (from /ai/analyze-performance)
 *  - Recent game sessions list
 *
 * All data is cached in AsyncStorage so the screen renders offline.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import useChildStore from "../src/store/useChildStore";
import { reportsService } from "../src/services/reportsService";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

const PERIOD_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "All Time", value: 365 },
];

const SKILL_COLOR_MAP = {
  Memory: Colors.blue,
  Language: Colors.green,
  "Motor Skills": Colors.yellow,
  Creativity: Colors.lavender,
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function ScreenHeader({ childName, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={16}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.backArrow}>←</Text>
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerEyebrow}>Progress Reports</Text>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {childName}'s Reports 📊
        </Text>
      </View>
    </View>
  );
}

function PeriodPicker({ selected, onChange }) {
  return (
    <View style={styles.periodRow}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Show last ${opt.label}`}
            style={({ pressed }) => [
              styles.periodChip,
              active && styles.periodChipActive,
              pressed && !active && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCard({ emoji, label, value, color }) {
  return (
    <View
      style={[styles.statCard, { borderColor: color + "45", backgroundColor: color + "18" }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SkillBar({ label, pct, color, enterDelay }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: pct / 100,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, enterDelay);
    return () => clearTimeout(timer);
  }, [pct, enterDelay]);

  const interpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={styles.skillBarWrapper}
      accessibilityLabel={`${label}: ${pct}%`}
    >
      <View style={styles.skillBarRow}>
        <Text style={styles.skillLabel}>{label}</Text>
        <Text style={[styles.skillPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.skillTrack}>
        <Animated.View
          style={[styles.skillFill, { width: interpolated, backgroundColor: color }]}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

function InsightRow({ text, index }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightBullet}>•</Text>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function SessionRow({ session, isLast }) {
  const date = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString()
    : "In progress";
  const score = session.finalScore ?? session.score ?? "—";
  const gameLabel = session.gameId ?? "Game";

  return (
    <View
      style={[styles.sessionRow, !isLast && styles.sessionRowBorder]}
      accessibilityLabel={`${gameLabel} on ${date}, score ${score}`}
    >
      <View style={styles.sessionDot} />
      <View style={styles.sessionMeta}>
        <Text style={styles.sessionGame} numberOfLines={1}>
          {gameLabel}
        </Text>
        <Text style={styles.sessionDate}>{date}</Text>
      </View>
      <Text style={styles.sessionScore}>{score}</Text>
    </View>
  );
}

function SectionCard({ title, children, enterDelay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    }, enterDelay);
    return () => clearTimeout(timer);
  }, [enterDelay]);

  return (
    <Animated.View
      style={[styles.sectionCard, { opacity, transform: [{ translateY: slideY }] }]}
    >
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const router = useRouter();
  const selectedChild = useChildStore((s) => s.selectedChild);
  const childName = selectedChild?.name ?? "Your learner";
  const childId = selectedChild?.$id;

  const [period, setPeriod] = useState(30);
  const [progress, setProgress] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!childId) {
        setIsLoading(false);
        return;
      }
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [prog, analy, sess] = await Promise.all([
          reportsService.getProgress(childId),
          reportsService.analyzePerformance(childId, period),
          reportsService.getSessions(childId),
        ]);
        setProgress(prog);
        setAnalysis(analy);
        setSessions(sess);
      } catch (err) {
        setError("Could not load reports. Check your connection.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [childId, period],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Derive display values from progress
  const skills = progress?.skills?.length
    ? progress.skills.map((s, i) => ({
        label: s.name ?? s.label ?? `Skill ${i + 1}`,
        pct: Math.round(s.score ?? s.pct ?? 0),
        color: SKILL_COLOR_MAP[s.name ?? s.label] ?? Colors.lavender,
      }))
    : [];

  const totalSessions = analysis?.totalSessions ?? sessions.length;
  const avgScore = analysis?.averageScore ? `${Math.round(analysis.averageScore)}%` : "—";
  const streak = progress?.streak ?? 0;
  const insights = Array.isArray(analysis?.insights) ? analysis.insights : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
      >
        <ScreenHeader childName={childName} onBack={() => router.back()} />

        {/* Period picker */}
        <PeriodPicker selected={period} onChange={setPeriod} />

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={styles.loadingText}>Loading reports…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorEmoji}>📡</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => fetchData()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading reports"
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Stats ── */}
            <SectionCard title="Summary" enterDelay={0}>
              <View style={styles.statsRow}>
                <StatCard emoji="📚" label="Sessions" value={totalSessions} color={Colors.blue} />
                <StatCard emoji="⭐" label="Avg Score" value={avgScore} color={Colors.yellow} />
                <StatCard emoji="🔥" label="Streak" value={`${streak}d`} color={Colors.orange} />
              </View>
              {analysis?._fromCache ? (
                <Text style={styles.cacheHint}>Showing cached data • Pull to refresh</Text>
              ) : null}
            </SectionCard>

            {/* ── Skill breakdown ── */}
            {skills.length > 0 ? (
              <SectionCard title="Skill Breakdown" enterDelay={160}>
                {skills.map((skill, i) => (
                  <SkillBar
                    key={skill.label}
                    label={skill.label}
                    pct={skill.pct}
                    color={skill.color}
                    enterDelay={240 + i * 100}
                  />
                ))}
              </SectionCard>
            ) : null}

            {/* ── AI Insights ── */}
            {!analysis?._unavailable && (
              <SectionCard title="AI Insights" enterDelay={320}>
                {insights.length > 0 ? (
                  insights.map((text, i) => (
                    <InsightRow key={i} text={text} index={i} />
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    Complete more sessions to unlock AI insights. 🌱
                  </Text>
                )}
              </SectionCard>
            )}

            {/* ── Session history ── */}
            <SectionCard title="Recent Sessions" enterDelay={480}>
              {sessions.length === 0 ? (
                <Text style={styles.emptyText}>
                  No sessions recorded yet. Start playing! 🎮
                </Text>
              ) : (
                sessions.slice(0, 15).map((sess, i) => (
                  <SessionRow
                    key={sess.$id ?? i}
                    session={sess}
                    isLast={i === Math.min(sessions.length, 15) - 1}
                  />
                ))
              )}
            </SectionCard>
          </>
        )}
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

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? 58 : 40,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backBtn: {
    marginRight: 14,
    marginTop: 4,
  },
  backArrow: {
    fontSize: FontSize["2xl"],
    color: Colors.textPrimary,
    lineHeight: 32,
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

  // Period picker
  periodRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
  },
  periodChipActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  periodChipText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  periodChipTextActive: {
    color: Colors.textOnDark,
  },

  // Loading / error
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  errorBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  errorEmoji: {
    fontSize: FontSize["5xl"],
  },
  errorText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  retryBtnText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textOnDark,
  },

  // Section card
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius["2xl"],
    padding: 20,
    marginBottom: 18,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 16,
  },

  // Stat cards
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
  },
  statEmoji: {
    fontSize: FontSize["2xl"],
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.semibold,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },

  // Cache hint
  cacheHint: {
    fontFamily: Typography.regular,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },

  // Skill bars
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

  // Insights
  insightRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  insightBullet: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.green,
    marginRight: 10,
    lineHeight: 22,
  },
  insightText: {
    flex: 1,
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  // Session rows
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.blue,
    marginRight: 14,
  },
  sessionMeta: {
    flex: 1,
  },
  sessionGame: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  sessionDate: {
    fontFamily: Typography.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionScore: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.greenDark,
  },

  // Empty
  emptyText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 10,
  },
});
