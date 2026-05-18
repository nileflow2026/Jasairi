/* eslint-disable react/no-unescaped-entities */
/**
 * Profile Selection Screen
 *
 * UX rationale:
 *  - When NOT authenticated: shows Guardian login cards + offline learner mode
 *  - When authenticated: shows child profile cards from backend + guardian card
 *  - Cards enter staggered so the eye has time to settle.
 *  - Each card has a dedicated brand color + emoji consistent across the app.
 *  - TTS announces the screen purpose on mount.
 *  - Pressed state gives immediate visual + haptic confirmation.
 *  - COPPA compliant: children never log in — guardians manage profiles.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import useAuthStore from "../src/store/useAuthStore";
import useChildStore from "../src/store/useChildStore";
import { Colors, Typography, FontSize, Radius } from "../src/theme/tokens";
import PrimaryButton from "../src/components/PrimaryButton";

// ─────────────────────────────────────────────────────────────
// Guardian profile definitions (shown when not authenticated)
// ─────────────────────────────────────────────────────────────
const GUARDIAN_PROFILES = [
  {
    id: "parent",
    emoji: "❤️",
    title: "I'm a Parent",
    subtitle: "Track progress and celebrate wins",
    accentColor: Colors.green,
    darkColor: Colors.greenDark,
    pillColor: Colors.greenLight,
    speech: "Welcome! Let's see how your child is getting on.",
    badgeText: "Guardian access",
  },
  {
    id: "teacher",
    emoji: "🎓",
    title: "I'm a Teacher",
    subtitle: "Guide students on their journey",
    accentColor: Colors.lavender,
    darkColor: Colors.lavenderDark,
    pillColor: Colors.lavenderLight,
    speech: "Welcome, teacher. Here's your classroom view.",
    badgeText: "Educator access",
  },
];

// Child avatar colors — cycles through brand palette for visual variety
const CHILD_COLORS = [
  { accent: Colors.blue, dark: Colors.blueDark, pill: Colors.blueLight },
  { accent: Colors.orange, dark: Colors.orangeDark, pill: Colors.orangeLight },
  { accent: Colors.green, dark: Colors.greenDark, pill: Colors.greenLight },
  {
    accent: Colors.lavender,
    dark: Colors.lavenderDark,
    pill: Colors.lavenderLight,
  },
  { accent: Colors.yellow, dark: Colors.yellowDark, pill: Colors.yellowLight },
];

function getChildColor(index) {
  return CHILD_COLORS[index % CHILD_COLORS.length];
}

// ─────────────────────────────────────────────────────────────
// Reusable profile card (guardian profiles)
// ─────────────────────────────────────────────────────────────
function ProfileCard({ profile, enterDelay, onSelect }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;

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
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }, enterDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterDelay]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <Pressable
        onPress={() => onSelect(profile)}
        accessibilityRole="button"
        accessibilityLabel={profile.title}
        accessibilityHint={profile.subtitle}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? profile.accentColor : Colors.surface,
            borderColor: pressed
              ? profile.darkColor
              : profile.accentColor + "55",
            shadowColor: profile.accentColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: pressed ? 0.55 : 0.22,
            shadowRadius: 14,
            elevation: pressed ? 14 : 5,
          },
        ]}
      >
        {({ pressed }) => (
          <>
            <View
              style={[styles.avatar, { backgroundColor: profile.pillColor }]}
              accessible={false}
              importantForAccessibility="no"
            >
              <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
            </View>
            <View
              style={styles.cardContent}
              accessible={false}
              importantForAccessibility="no"
            >
              <Text
                style={[styles.cardTitle, pressed && styles.cardTitlePressed]}
              >
                {profile.title}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  pressed && styles.cardSubtitlePressed,
                ]}
              >
                {profile.subtitle}
              </Text>
              <View
                style={[styles.badge, { backgroundColor: profile.pillColor }]}
              >
                <Text style={[styles.badgeText, { color: profile.darkColor }]}>
                  {profile.badgeText}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.chevron,
                { color: pressed ? Colors.textOnDark : profile.accentColor },
              ]}
              accessible={false}
              importantForAccessibility="no"
            >
              ›
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Child card — name-initial avatar, pulled from backend
// ─────────────────────────────────────────────────────────────
function ChildCard({ child, index, enterDelay, onSelect }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;
  const color = getChildColor(index);
  const initial = (child.name || "?")[0].toUpperCase();

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
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }, enterDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterDelay]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <Pressable
        onPress={() => onSelect(child)}
        accessibilityRole="button"
        accessibilityLabel={`${child.name}, age ${child.age}`}
        accessibilityHint="Tap to start learning"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? color.accent : Colors.surface,
            borderColor: pressed ? color.dark : color.accent + "55",
            shadowColor: color.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: pressed ? 0.55 : 0.22,
            shadowRadius: 14,
            elevation: pressed ? 14 : 5,
          },
        ]}
      >
        {({ pressed }) => (
          <>
            <View
              style={[styles.avatar, { backgroundColor: color.pill }]}
              accessible={false}
            >
              <Text style={[styles.avatarInitial, { color: color.dark }]}>
                {initial}
              </Text>
            </View>
            <View style={styles.cardContent} accessible={false}>
              <Text
                style={[styles.cardTitle, pressed && styles.cardTitlePressed]}
              >
                {child.name}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  pressed && styles.cardSubtitlePressed,
                ]}
              >
                🌟 Ready to learn
              </Text>
              <View style={[styles.badge, { backgroundColor: color.pill }]}>
                <Text style={[styles.badgeText, { color: color.dark }]}>
                  Age {child.age}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.chevron,
                { color: pressed ? Colors.textOnDark : color.accent },
              ]}
              accessible={false}
            >
              ›
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Child bottom sheet modal
// ─────────────────────────────────────────────────────────────
function AddChildModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setName("");
    setAge("");
    setError(null);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setError("Please enter the child's name.");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 25) {
      setError("Please enter a valid age (1–25).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onAdd({ name: name.trim(), age: ageNum });
      reset();
      onClose();
    } catch (err) {
      setError(err.message || "Could not add child. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalSheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle} accessibilityRole="header">
              Add a Learner 🌟
            </Text>
            <Text style={styles.modalSubtitle}>
              Create a learning profile for your child
            </Text>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Text style={styles.inputLabel}>Child's name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="e.g. Amara"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="Child's name"
              editable={!loading}
            />
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="e.g. 8"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="Child's age"
              editable={!loading}
            />
            <PrimaryButton
              title="Add Profile"
              onPress={handleAdd}
              loading={loading}
              backgroundColor={Colors.orange}
              pressedColor={Colors.orangeDark}
              style={{ marginTop: 20 }}
              accessibilityLabel="Add child profile"
              accessibilityHint="Save the new learner profile"
            />
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Role-based dashboard routing
// ─────────────────────────────────────────────────────────────
const ROLE_DASHBOARD_ROUTE = {
  teacher: "/teacher-dashboard",
  therapist: "/therapist-dashboard",
  caregiver: "/caregiver-dashboard",
  parent: "/parent-dashboard",
};

const ROLE_CARD_CONFIG = {
  teacher: {
    emoji: "🎓",
    title: "Teacher Dashboard",
    subtitle: "Track student progress and lessons",
    accentColor: Colors.lavender,
    darkColor: Colors.lavenderDark,
    pillColor: Colors.lavenderLight,
    speech: "Welcome! Here is your classroom overview.",
    badgeText: "Educator access",
  },
  therapist: {
    emoji: "🩺",
    title: "Therapist Dashboard",
    subtitle: "Monitor sessions and milestones",
    accentColor: Colors.blue,
    darkColor: Colors.blueDark,
    pillColor: Colors.blueLight,
    speech: "Welcome! Here are your therapy sessions.",
    badgeText: "Therapist access",
  },
  caregiver: {
    emoji: "🤝",
    title: "Caregiver Dashboard",
    subtitle: "Track daily care and development",
    accentColor: Colors.green,
    darkColor: Colors.greenDark,
    pillColor: Colors.greenLight,
    speech: "Welcome! Let's see how your learner is doing.",
    badgeText: "Caregiver access",
  },
  parent: {
    emoji: "📊",
    title: "Parent Dashboard",
    subtitle: "View progress, skills and activities",
    accentColor: Colors.green,
    darkColor: Colors.greenDark,
    pillColor: Colors.greenLight,
    speech: "Welcome! Let's see how your child is getting on.",
    badgeText: "Guardian access",
  },
};

export default function SelectProfileScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const children = useChildStore((s) => s.children);
  const isLoading = useChildStore((s) => s.isLoading);
  const addChild = useChildStore((s) => s.addChild);
  const selectChild = useChildStore((s) => s.selectChild);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    Speech.stop();
    Speech.speak("Who is using Jasiri today?", {
      language: "en",
      pitch: 1.0,
      rate: 0.78,
      onError: (err) => console.warn("[TTS] select-profile mount error:", err),
    });
    return () => Speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haptic = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Single nav timer ref — cleared on each interaction to prevent double-push
  const navTimerRef = useRef(null);
  const scheduleNav = (route, delay = 350) => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => router.push(route), delay);
  };

  const handleGuardianSelect = useCallback(
    (profile) => {
      haptic();
      Speech.stop();
      Speech.speak(profile.speech, {
        language: "en",
        pitch: 1.05,
        rate: 0.8,
        onError: (err) => console.warn("[TTS] guardian speech error:", err),
      });
      if (isAuthenticated) {
        const role = user?.role ?? "parent";
        const route = ROLE_DASHBOARD_ROUTE[role] ?? "/parent-dashboard";
        scheduleNav(route);
      } else {
        scheduleNav("/(auth)/login");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, user?.role],
  );

  const handleChildSelect = useCallback(
    async (child) => {
      haptic();
      Speech.stop();
      Speech.speak(`Hi ${child.name}! Let's start your adventure!`, {
        language: "en",
        pitch: 1.1,
        rate: 0.8,
        onError: (err) => console.warn("[TTS] child greeting error:", err),
      });
      await selectChild(child);
      scheduleNav("/child-home");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectChild],
  );

  const handleOfflineLearner = useCallback(() => {
    haptic();
    Speech.stop();
    Speech.speak("Hi there! Let's start your adventure!", {
      language: "en",
      pitch: 1.1,
      rate: 0.8,
      onError: (err) => console.warn("[TTS] offline learner speech error:", err),
    });
    scheduleNav("/child-home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddChild = async (data) => {
    await addChild(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />

      {/* Warm arch — sits behind the scroll content */}
      <View style={styles.arch} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.headerBlock,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: pressed
                    ? Colors.orangeDark
                    : "rgba(255,255,255,0.25)",
                },
              ]}
            >
              <Text style={styles.backBtnText}>‹ Back</Text>
            </Pressable>
            {isAuthenticated && (
              <Pressable
                onPress={() => {
                  haptic();
                  logout();
                }}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={({ pressed }) => [
                  styles.logoutBtn,
                  {
                    backgroundColor: pressed
                      ? Colors.errorLight
                      : "rgba(255,255,255,0.25)",
                  },
                ]}
              >
                <Text style={styles.logoutBtnText}>Log out</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.overline}>Welcome to Jasiri</Text>
          <Text style={styles.heading} accessibilityRole="header">
            {isAuthenticated
              ? `Hello, ${user?.name?.split(" ")[0]}! 🎉`
              : "Who's learning\ntoday? 🎉"}
          </Text>
          <Text style={styles.subheading}>
            {isAuthenticated
              ? "Select a learner or view your dashboard"
              : "Tap your card to get started"}
          </Text>
        </Animated.View>

        {/* Spacer so cards clear the arch */}
        <View style={styles.archSpacer} />

        {/* ── Authenticated: child profiles ── */}
        {isAuthenticated && (
          <>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.blue} />
                <Text style={styles.loadingText}>Loading profiles…</Text>
              </View>
            ) : children.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Learners</Text>
                {children.map((child, i) => (
                  <ChildCard
                    key={child.$id}
                    child={child}
                    index={i}
                    enterDelay={i * 120}
                    onSelect={handleChildSelect}
                  />
                ))}
                <Pressable
                  onPress={() => setShowAddChild(true)}
                  style={({ pressed }) => [
                    styles.addChildRow,
                    {
                      backgroundColor: pressed
                        ? Colors.blueLight
                        : Colors.surface,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add another learner"
                >
                  <View style={styles.addChildIcon}>
                    <Text style={styles.addChildPlus}>+</Text>
                  </View>
                  <Text style={styles.addChildLabel}>Add another learner</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🧒</Text>
                <Text style={styles.emptyTitle}>No learners yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first child profile to start their learning journey
                </Text>
                <Pressable
                  onPress={() => setShowAddChild(true)}
                  style={({ pressed }) => [
                    styles.emptyAddBtn,
                    {
                      backgroundColor: pressed
                        ? Colors.orangeDark
                        : Colors.orange,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add your first child"
                >
                  <Text style={styles.emptyAddBtnText}>+ Add Learner</Text>
                </Pressable>
              </View>
            )}
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              Guardian
            </Text>
            <ProfileCard
              profile={{
                id: "dashboard",
                ...(ROLE_CARD_CONFIG[user?.role] ?? ROLE_CARD_CONFIG.parent),
              }}
              enterDelay={0}
              onSelect={handleGuardianSelect}
            />
          </>
        )}

        {/* ── Unauthenticated: guardian + offline learner cards ── */}
        {!isAuthenticated && (
          <>
            {GUARDIAN_PROFILES.map((profile, i) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                enterDelay={200 + i * 140}
                onSelect={handleGuardianSelect}
              />
            ))}
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              Learner
            </Text>
            <ProfileCard
              profile={{
                id: "child",
                emoji: "🌟",
                title: "I'm a Learner!",
                subtitle: "Play, explore and grow",
                accentColor: Colors.blue,
                darkColor: Colors.blueDark,
                pillColor: Colors.blueLight,
                speech: "Hi there! Let's start your adventure!",
                badgeText: "Ages 4 – 18",
              }}
              enterDelay={500}
              onSelect={handleOfflineLearner}
            />
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Log in as a Parent to save progress and track development
              </Text>
            </View>
          </>
        )}

        {/* ── Privacy note ── */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            COPPA compliant. Children never log in directly. Learning data is
            protected and private.
          </Text>
        </View>
      </ScrollView>

      <AddChildModal
        visible={showAddChild}
        onClose={() => setShowAddChild(false)}
        onAdd={handleAddChild}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Screen
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  arch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: Colors.orange,
    borderBottomLeftRadius: Radius["4xl"],
    borderBottomRightRadius: Radius["4xl"],
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 52,
  },

  // Header
  headerBlock: {
    paddingTop: Platform.OS === "ios" ? 64 : 48,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  backBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backBtnText: {
    fontSize: FontSize.base,
    fontFamily: Typography.bold,
    color: Colors.textOnDark,
  },
  logoutBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logoutBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Typography.bold,
    color: Colors.textOnDark,
  },
  overline: {
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
    color: Colors.textOnDark,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 10,
    opacity: 0.85,
  },
  heading: {
    fontSize: FontSize["3xl"],
    fontFamily: Typography.bold,
    color: Colors.textOnDark,
    lineHeight: FontSize["3xl"] * 1.35,
  },
  subheading: {
    fontSize: FontSize.base,
    fontFamily: Typography.medium,
    color: Colors.textOnDark,
    marginTop: 8,
    lineHeight: FontSize.base * 1.5,
    opacity: 0.88,
  },
  archSpacer: {
    height: 40,
  },

  // Section label
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  sectionLabelSpaced: {
    marginTop: 8,
  },

  // Cards
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: Radius["3xl"],
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 110,
    borderWidth: 2.5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  avatarInitial: {
    fontSize: 36,
    fontFamily: Typography.bold,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  cardTitlePressed: {
    color: Colors.textOnDark,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
    marginBottom: 8,
  },
  cardSubtitlePressed: {
    color: "rgba(255,255,255,0.88)",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
  },
  chevron: {
    fontSize: 26,
    marginLeft: 8,
  },

  // Add child row
  addChildRow: {
    borderRadius: Radius.xl,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.blue,
    marginBottom: 24,
  },
  addChildIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.blueLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  addChildPlus: {
    fontSize: 26,
    fontFamily: Typography.bold,
    color: Colors.blueDark,
  },
  addChildLabel: {
    fontSize: FontSize.base,
    fontFamily: Typography.bold,
    color: Colors.blue,
  },

  // Empty state
  emptyBox: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyAddBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyAddBtnText: {
    color: Colors.textOnDark,
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
  },

  // Loading
  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontFamily: Typography.regular,
  },

  // Tip banner
  tipBox: {
    backgroundColor: Colors.yellowLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
    color: Colors.yellowDark,
    textAlign: "center",
  },

  // Privacy note
  privacyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 8,
  },
  privacyIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontFamily: Typography.medium,
    color: Colors.greenDark,
    lineHeight: FontSize.xs * 1.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Colors.overlay,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius["3xl"],
    borderTopRightRadius: Radius["3xl"],
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: FontSize["2xl"],
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.errorDark,
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.base,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
  },
  addButton: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: {
    color: Colors.textOnDark,
    fontSize: FontSize.base,
    fontFamily: Typography.bold,
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 16,
    paddingBottom: 8,
  },
  cancelText: {
    fontSize: FontSize.base,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
});
