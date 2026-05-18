/* eslint-disable react/no-unescaped-entities */
/**
 * Guardian Register Screen
 *
 * COPPA compliant: only guardians create accounts.
 * Children are managed as sub-profiles — they never register directly.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import PrimaryButton from "../../src/components/PrimaryButton";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../../src/theme/tokens";

const ROLES = [
  { id: "parent", label: "Parent / Guardian", emoji: "❤️" },
  /* { id: "teacher", label: "Teacher", emoji: "🎓" },
  { id: "therapist", label: "Therapist", emoji: "🩺" },
  { id: "caregiver", label: "Caregiver", emoji: "🤝" }, */
];

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("parent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [phone, setPhone] = useState("");

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validate = () => {
    if (!name.trim()) return "Please enter your name.";
    if (!email.trim() || !email.includes("@"))
      return "Please enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password))
      return "Password must include an uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must include a number.";
    if (phone.trim() && !/^[+\d][\d\s\-().]{6,18}$/.test(phone.trim()))
      return "Please enter a valid phone number.";
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      shake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phoneNumber: phone.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // TODO: navigate to /verify-email once an email service is configured
      router.replace("/select-profile");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        err.status === 409
          ? "An account with that email already exists."
          : err.isNetworkError
            ? "Cannot connect to server. Check your connection."
            : err.message || "Registration failed. Please try again.",
      );
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Lavender arch decoration behind content */}
      <View style={styles.arch} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <View style={styles.mascotCircle}>
            <Image
              source={require("../../assets/images/mascot-welcome.png")}
              style={styles.mascotImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading} accessibilityRole="header">
          Create account 🌟
        </Text>
        <Text style={styles.subheading}>
          Start your child's learning journey
        </Text>

        {/* Error banner */}
        {error ? (
          <Animated.View
            style={[
              styles.errorBanner,
              { transform: [{ translateX: shakeAnim }] },
            ]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={error}
          >
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* Name */}
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={[styles.input, focusedField === "name" && styles.inputFocused]}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
          accessibilityLabel="Your name"
          editable={!loading}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.textSecondary}
        />

        {/* Phone number (optional) */}
        <Text style={styles.label}>
          Phone number <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <View
          style={[
            styles.inputRow,
            focusedField === "phone" && styles.inputRowFocused,
          ]}
        >
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>🇰🇪 +254</Text>
          </View>
          <View style={styles.dividerV} />
          <TextInput
            ref={phoneRef}
            style={styles.inputInner}
            value={phone}
            onChangeText={(v) => {
              // Strip leading 0 (Kenyan convention) and allow digits, spaces, dashes
              const cleaned = v.replace(/[^\d\s\-().]/g, "");
              setPhone(cleaned);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
            accessibilityLabel="Phone number"
            accessibilityHint="Optional. Used for account recovery."
            editable={!loading}
            placeholder="712 345 678"
            placeholderTextColor={Colors.textSecondary}
            maxLength={15}
          />
        </View>
        <Text style={styles.phoneHint}>Used for account recovery only</Text>

        {/* Email */}
        <Text style={styles.label}>Email address</Text>
        <TextInput
          ref={emailRef}
          style={[
            styles.input,
            focusedField === "email" && styles.inputFocused,
          ]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          accessibilityLabel="Email address"
          editable={!loading}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textSecondary}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View
          style={[
            styles.inputRow,
            focusedField === "password" && styles.inputRowFocused,
          ]}
        >
          <TextInput
            ref={passwordRef}
            style={styles.inputInner}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            autoComplete="new-password"
            returnKeyType="done"
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            accessibilityLabel="Password"
            accessibilityHint="At least 8 characters, one uppercase letter, one number"
            editable={!loading}
            placeholder="Min 8 chars"
            placeholderTextColor={Colors.textSecondary}
          />
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? "Hide password" : "Show password"
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>
        <Text style={styles.passwordHint}>
          Min 8 chars · one uppercase · one number
        </Text>

        {/* Role selector */}
        <Text style={[styles.label, styles.roleSectionLabel]}>I am a…</Text>
        <View style={styles.rolesRow}>
          {ROLES.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRole(r.id)}
              style={[
                styles.rolePill,
                role === r.id
                  ? styles.rolePillSelected
                  : styles.rolePillUnselected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: role === r.id }}
              accessibilityLabel={r.label}
            >
              <Text style={styles.roleEmoji}>{r.emoji}</Text>
              <Text
                style={[
                  styles.roleLabel,
                  role === r.id
                    ? styles.roleLabelSelected
                    : styles.roleLabelUnselected,
                ]}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Register CTA */}
        <PrimaryButton
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          backgroundColor={Colors.lavender}
          pressedColor={Colors.lavenderDark}
          style={styles.ctaButton}
          accessibilityLabel="Create account"
          accessibilityHint="Register your guardian account"
        />

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.loginLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  arch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: Colors.lavenderLight,
    borderBottomLeftRadius: Radius["4xl"],
    borderBottomRightRadius: Radius["4xl"],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 48,
  },
  backBtn: {
    marginBottom: 16,
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 28,
    color: Colors.textPrimary,
  },
  mascotWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  mascotCircle: {
    width: 92,
    height: 92,
    borderRadius: Radius.full,
    backgroundColor: Colors.lavender,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lavender,
  },
  mascotImage: {
    width: 60,
    height: 60,
  },
  heading: {
    fontFamily: Typography.bold,
    fontSize: FontSize["3xl"],
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subheading: {
    fontFamily: Typography.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.errorDark,
  },
  label: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  roleSectionLabel: {
    marginTop: 20,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: FontSize.base,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    minHeight: 56,
    ...Shadows.xs,
  },
  inputFocused: {
    borderColor: Colors.blue,
    borderWidth: 2,
  },
  // Password row: input + eye toggle
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 56,
    ...Shadows.xs,
  },
  inputRowFocused: {
    borderColor: Colors.blue,
    borderWidth: 2,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: FontSize.base,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordHint: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  optionalTag: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  countryCodeText: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  dividerV: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    alignSelf: "center",
  },
  phoneHint: {
    fontFamily: Typography.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  rolesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.full,
    minHeight: 44,
  },
  rolePillSelected: {
    backgroundColor: Colors.lavender,
    ...Shadows.lavender,
  },
  rolePillUnselected: {
    backgroundColor: Colors.lavenderLight,
  },
  roleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  roleLabel: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.xs,
  },
  roleLabelSelected: {
    color: Colors.textOnDark,
  },
  roleLabelUnselected: {
    color: Colors.lavenderDark,
  },
  ctaButton: {
    marginTop: 28,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  loginText: {
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.lavenderDark,
  },
});
