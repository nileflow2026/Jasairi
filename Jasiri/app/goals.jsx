/* eslint-disable no-unused-vars */
/**
 * Set Goals Screen — Parent Dashboard
 *
 * Allows parents to configure learning goals for their child:
 *  - Daily session time target
 *  - Focus skill areas
 *  - Weekly session frequency
 *  - Preferred difficulty level
 *
 * Goals persist in AsyncStorage and the daily session length
 * is synced to the backend so the AI engine can use it.
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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import useChildStore from "../src/store/useChildStore";
import {
  goalsService,
  SKILL_OPTIONS,
  DIFFICULTY_OPTIONS,
  SESSION_MINUTE_OPTIONS,
  DEFAULT_GOALS,
} from "../src/services/goalsService";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Back button row with child name */
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
        <Text style={styles.headerEyebrow}>Learning Goals</Text>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {childName}'s Goals 🎯
        </Text>
      </View>
    </View>
  );
}

/** Step-selector for daily minutes */
function MinuteSelector({ value, onChange }) {
  return (
    <View style={styles.optionRow}>
      {SESSION_MINUTE_OPTIONS.map((min) => {
        const selected = value === min;
        return (
          <Pressable
            key={min}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onChange(min);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${min} minutes`}
            style={({ pressed }) => [
              styles.minuteChip,
              selected && styles.minuteChipSelected,
              pressed && !selected && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.minuteChipText,
                selected && styles.minuteChipTextSelected,
              ]}
            >
              {min}m
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Toggle chips for skill selection */
function SkillChips({ selected, onChange }) {
  const toggle = (skill) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (selected.includes(skill)) {
      // Must keep at least one skill
      if (selected.length === 1) return;
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  };

  return (
    <View style={styles.skillChipRow}>
      {SKILL_OPTIONS.map((skill) => {
        const isOn = selected.includes(skill);
        return (
          <Pressable
            key={skill}
            onPress={() => toggle(skill)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isOn }}
            accessibilityLabel={`Focus on ${skill}`}
            style={({ pressed }) => [
              styles.skillChip,
              isOn && styles.skillChipOn,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.skillChipText, isOn && styles.skillChipTextOn]}>
              {skill}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Difficulty pill selector */
function DifficultySelector({ value, onChange }) {
  const LABELS = { beginner: "🌱 Beginner", intermediate: "⚡ Intermediate", advanced: "🚀 Advanced" };
  return (
    <View style={styles.diffRow}>
      {DIFFICULTY_OPTIONS.map((d) => {
        const selected = value === d;
        return (
          <Pressable
            key={d}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onChange(d);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={LABELS[d]}
            style={({ pressed }) => [
              styles.diffChip,
              selected && styles.diffChipSelected,
              pressed && !selected && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.diffText,
                selected && styles.diffTextSelected,
              ]}
              numberOfLines={1}
            >
              {LABELS[d]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Weekly days stepper */
function DayStepper({ value, onChange }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => {
          if (value > 1) {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            onChange(value - 1);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Decrease weekly sessions"
        hitSlop={12}
        style={({ pressed }) => [
          styles.stepperBtn,
          pressed && { opacity: 0.6 },
          value <= 1 && styles.stepperBtnDisabled,
        ]}
        disabled={value <= 1}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <Text
        style={styles.stepperValue}
        accessibilityLabel={`${value} days per week`}
      >
        {value}
        <Text style={styles.stepperUnit}> days/week</Text>
      </Text>
      <Pressable
        onPress={() => {
          if (value < 7) {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            onChange(value + 1);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Increase weekly sessions"
        hitSlop={12}
        style={({ pressed }) => [
          styles.stepperBtn,
          pressed && { opacity: 0.6 },
          value >= 7 && styles.stepperBtnDisabled,
        ]}
        disabled={value >= 7}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

/** Section card wrapper */
function Section({ title, hint, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const router = useRouter();
  const selectedChild = useChildStore((s) => s.selectedChild);
  const childName = selectedChild?.name ?? "Your learner";
  const childId = selectedChild?.$id;

  const [goals, setGoals] = useState(null); // null = loading
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveAnim = useRef(new Animated.Value(1)).current;

  // Load goals on mount
  useEffect(() => {
    if (!childId) {
      setGoals({ ...DEFAULT_GOALS });
      return;
    }
    goalsService.load(childId).then(setGoals);
  }, [childId]);

  const handleSave = useCallback(async () => {
    if (!goals || isSaving) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    try {
      await goalsService.save(childId, goals);
      setSaved(true);
      // Pulse animation
      Animated.sequence([
        Animated.timing(saveAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(saveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert("Could not save goals", "Your goals are saved locally and will sync when you're back online.");
    } finally {
      setIsSaving(false);
    }
  }, [goals, isSaving, childId, saveAnim]);

  if (!goals) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          childName={childName}
          onBack={() => router.back()}
        />

        {/* ── Intro banner ── */}
        <View style={styles.introBanner}>
          <Text style={styles.introBannerText}>
            Goals help JASIRI personalise {childName}'s learning journey.
            Changes take effect at the next session. 🌟
          </Text>
        </View>

        {/* ── Daily minutes ── */}
        <Section
          title="Daily Learning Time"
          hint="How many minutes should each day's session last?"
        >
          <MinuteSelector
            value={goals.dailyMinutes}
            onChange={(v) => setGoals((g) => ({ ...g, dailyMinutes: v }))}
          />
        </Section>

        {/* ── Focus skills ── */}
        <Section
          title="Focus Skills"
          hint="Select one or more areas to prioritise. At least one must be chosen."
        >
          <SkillChips
            selected={goals.focusSkills}
            onChange={(v) => setGoals((g) => ({ ...g, focusSkills: v }))}
          />
        </Section>

        {/* ── Difficulty ── */}
        <Section
          title="Difficulty Level"
          hint="The AI will adapt automatically, but this sets the starting point."
        >
          <DifficultySelector
            value={goals.difficulty}
            onChange={(v) => setGoals((g) => ({ ...g, difficulty: v }))}
          />
        </Section>

        {/* ── Weekly sessions ── */}
        <Section
          title="Weekly Session Target"
          hint="How many days per week should learning happen?"
        >
          <DayStepper
            value={goals.weeklySessionTarget}
            onChange={(v) => setGoals((g) => ({ ...g, weeklySessionTarget: v }))}
          />
        </Section>

        {/* ── Last saved hint ── */}
        {goals.updatedAt ? (
          <Text style={styles.lastSaved}>
            Last saved: {new Date(goals.updatedAt).toLocaleDateString()}
          </Text>
        ) : null}

        {/* ── Save CTA ── */}
        <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Goals saved" : "Save goals"}
            style={({ pressed }) => [
              styles.saveBtn,
              saved && styles.saveBtnSuccess,
              pressed && { opacity: 0.88 },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.textOnDark} />
            ) : (
              <Text style={styles.saveBtnText}>
                {saved ? "✓ Goals Saved!" : "Save Goals"}
              </Text>
            )}
          </Pressable>
        </Animated.View>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  // Intro banner
  introBanner: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 24,
  },
  introBannerText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.blueDark,
    lineHeight: 22,
  },

  // Section
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius["2xl"],
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sectionHint: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Minute chips
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  minuteChip: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 56,
    alignItems: "center",
  },
  minuteChipSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  minuteChipText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  minuteChipTextSelected: {
    color: Colors.textOnDark,
  },

  // Skill chips
  skillChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  skillChip: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  skillChipOn: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  skillChipText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  skillChipTextOn: {
    color: Colors.textOnDark,
  },

  // Difficulty
  diffRow: {
    flexDirection: "row",
    gap: 10,
  },
  diffChip: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  diffChipSelected: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  diffText: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    textAlign: "center",
  },
  diffTextSelected: {
    color: Colors.textOnDark,
  },

  // Stepper
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperBtnText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  stepperValue: {
    fontFamily: Typography.bold,
    fontSize: FontSize["2xl"],
    color: Colors.textPrimary,
  },
  stepperUnit: {
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Last saved
  lastSaved: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },

  // Save button
  saveBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: "center",
    ...Shadows.orange,
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtnSuccess: {
    backgroundColor: Colors.green,
  },
  saveBtnText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textOnDark,
    letterSpacing: 0.3,
  },
});
