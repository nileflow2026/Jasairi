/* eslint-disable no-unused-vars */
/**
 * Settings Screen — Parent Dashboard
 *
 * Organised into three clear sections:
 *  1. Child Profile — edit the active child's name and age
 *  2. Accessibility — toggle high-contrast, large text, audio cues
 *     (stored locally; read by the app shell on startup)
 *  3. Account — show guardian info, log out
 *
 * Child profile updates are sent to PATCH /children/:id.
 * Accessibility preferences are stored in AsyncStorage.
 * Logout calls authService via the auth store.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
  Switch,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAuthStore from "../src/store/useAuthStore";
import useChildStore from "../src/store/useChildStore";
import { childService } from "../src/services/childService";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

const ACCESSIBILITY_KEY = "@jasiri_accessibility";

const DEFAULT_ACCESSIBILITY = {
  highContrast: false,
  largeText: false,
  audioFeedback: true,
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function ScreenHeader({ onBack }) {
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
        <Text style={styles.headerEyebrow}>Preferences</Text>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Settings ⚙️
        </Text>
      </View>
    </View>
  );
}

/** Labelled card section */
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

/** Text input row inside a section */
function FieldRow({ label, value, onChange, placeholder, keyboardType = "default", maxLength }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.fieldInput}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Toggle row */
function ToggleRow({ label, hint, value, onChange, isLast }) {
  return (
    <View style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
      <View style={styles.toggleMeta}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          onChange(v);
        }}
        thumbColor={value ? Colors.white : Colors.white}
        trackColor={{ false: Colors.border, true: Colors.green }}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

/** Plain info row */
function InfoRow({ label, value, isLast }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const selectedChild = useChildStore((s) => s.selectedChild);
  const setSelectedChild = useChildStore((s) => s.selectChild);

  // ── Child profile edit state ──
  const [childName, setChildName] = useState(selectedChild?.name ?? "");
  const [childAge, setChildAge] = useState(
    selectedChild?.age ? String(selectedChild.age) : "",
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const profileSaveAnim = useRef(new Animated.Value(1)).current;

  // ── Accessibility state ──
  const [accessibility, setAccessibility] = useState(DEFAULT_ACCESSIBILITY);
  const [accessibilityLoaded, setAccessibilityLoaded] = useState(false);

  // ── Logout state ──
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load accessibility settings
  useEffect(() => {
    AsyncStorage.getItem(ACCESSIBILITY_KEY)
      .then((raw) => {
        if (raw) {
          setAccessibility({ ...DEFAULT_ACCESSIBILITY, ...JSON.parse(raw) });
        }
      })
      .catch(() => {})
      .finally(() => setAccessibilityLoaded(true));
  }, []);

  // Sync child name/age from store when screen mounts
  useEffect(() => {
    if (selectedChild) {
      setChildName(selectedChild.name ?? "");
      setChildAge(selectedChild.age ? String(selectedChild.age) : "");
    }
  }, [selectedChild?.$id]);

  const saveAccessibility = useCallback(async (updated) => {
    setAccessibility(updated);
    try {
      await AsyncStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(updated));
    } catch {
      // Non-fatal
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!selectedChild?.$id) return;
    const ageNum = parseInt(childAge, 10);
    if (!childName.trim()) {
      Alert.alert("Name required", "Please enter the child's name.");
      return;
    }
    if (!childAge || isNaN(ageNum) || ageNum < 1 || ageNum > 18) {
      Alert.alert("Invalid age", "Age must be a number between 1 and 18.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await childService.update(selectedChild.$id, {
        name: childName.trim(),
        age: ageNum,
      });
      // Refresh child in store
      await setSelectedChild(updated);

      setProfileSaved(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Animated.sequence([
        Animated.timing(profileSaveAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(profileSaveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      Alert.alert(
        "Could not save profile",
        err.message || "Please check your connection and try again.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }, [selectedChild, childName, childAge, setSelectedChild, profileSaveAnim]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              router.replace("/(auth)/login");
            } catch {
              setIsLoggingOut(false);
              Alert.alert("Error", "Could not log out. Please try again.");
            }
          },
        },
      ],
    );
  }, [logout, router]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader onBack={() => router.back()} />

        {/* ── Child Profile ── */}
        {selectedChild ? (
          <Section title="Child Profile">
            <FieldRow
              label="Name"
              value={childName}
              onChange={setChildName}
              placeholder="Child's name"
              maxLength={60}
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              label="Age"
              value={childAge}
              onChange={(v) => setChildAge(v.replace(/[^0-9]/g, ""))}
              placeholder="Age (1–18)"
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.saveBtnWrapper}>
              <Animated.View style={{ transform: [{ scale: profileSaveAnim }] }}>
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  accessibilityRole="button"
                  accessibilityLabel={profileSaved ? "Profile saved" : "Save child profile"}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    profileSaved && styles.saveBtnSuccess,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator color={Colors.textOnDark} />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {profileSaved ? "✓ Saved!" : "Save Profile"}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </Section>
        ) : (
          <Section title="Child Profile">
            <Text style={styles.noChildText}>
              No child profile selected. Go back and select a learner first.
            </Text>
          </Section>
        )}

        {/* ── Accessibility ── */}
        <Section title="Accessibility">
          {!accessibilityLoaded ? (
            <ActivityIndicator color={Colors.orange} style={{ marginVertical: 16 }} />
          ) : (
            <>
              <ToggleRow
                label="High Contrast"
                hint="Increases colour contrast for better visibility"
                value={accessibility.highContrast}
                onChange={(v) =>
                  saveAccessibility({ ...accessibility, highContrast: v })
                }
              />
              <ToggleRow
                label="Large Text"
                hint="Increases font sizes across the app"
                value={accessibility.largeText}
                onChange={(v) =>
                  saveAccessibility({ ...accessibility, largeText: v })
                }
              />
              <ToggleRow
                label="Audio Feedback"
                hint="Play sounds for rewards and correct answers"
                value={accessibility.audioFeedback}
                onChange={(v) =>
                  saveAccessibility({ ...accessibility, audioFeedback: v })
                }
                isLast
              />
            </>
          )}
        </Section>

        {/* ── Account ── */}
        <Section title="Account">
          <InfoRow label="Name" value={user?.name ?? "—"} />
          <InfoRow label="Email" value={user?.email ?? "—"} />
          <InfoRow label="Role" value={user?.role ?? "parent"} isLast />
        </Section>

        {/* ── Logout ── */}
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={Colors.error} />
          ) : (
            <>
              <Text style={styles.logoutEmoji}>👋</Text>
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.versionText}>JASIRI v1.0 — Made with 💛 in Kenya</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontFamily: Typography.bold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    ...Shadows.sm,
  },

  // Field row
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
    minHeight: 56,
  },
  fieldLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    width: 60,
  },
  fieldInput: {
    flex: 1,
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 18,
  },

  // Save button (inside card)
  saveBtnWrapper: {
    padding: 16,
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.orange,
  },
  saveBtnSuccess: {
    backgroundColor: Colors.green,
  },
  saveBtnText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textOnDark,
  },

  // No child
  noChildText: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    padding: 20,
    textAlign: "center",
  },

  // Toggle row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  toggleMeta: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  toggleHint: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  infoValue: {
    fontFamily: Typography.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    maxWidth: "60%",
    textAlign: "right",
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.error,
    marginBottom: 20,
    gap: 8,
  },
  logoutEmoji: {
    fontSize: FontSize.lg,
  },
  logoutText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.error,
  },

  // Version
  versionText: {
    fontFamily: Typography.regular,
    fontSize: FontSize["2xs"],
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
