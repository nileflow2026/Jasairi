/**
 * Guardian Login Screen — JASIRI
 *
 * Design: warm, trustworthy, calm — never clinical or intimidating.
 * Large inputs, clear labels, single focused CTA.
 * Brand: Poppins fonts, #FF8A3D orange, #FFF9F2 warm background.
 * Accessible: labeled inputs, error announces via accessibilityLiveRegion.
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
import useAuthStore from "../../src/store/useAuthStore";
import PrimaryButton from "../../src/components/PrimaryButton";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../../src/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef(null);
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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      shake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/select-profile");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        err.status === 401
          ? "Incorrect email or password."
          : err.isNetworkError
            ? "Cannot connect to server. Check your connection."
            : err.message || "Something went wrong. Please try again.",
      );
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Soft blue arch */}
      <View
        style={styles.arch}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
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
        <View style={styles.mascotRow}>
          <View style={styles.mascotCircle}>
            <Image
              source={require("../../assets/images/mascot-welcome.png")}
              style={styles.mascotImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        {/* Header */}
        <Text style={styles.heading} accessibilityRole="header">
          Welcome back 👋
        </Text>
        <Text style={styles.subheading}>Sign in to your guardian account</Text>

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
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </Animated.View>
        ) : null}

        {/* Email field */}
        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={[styles.input, emailFocused && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          accessibilityLabel="Email address"
          accessibilityHint="Enter your guardian email address"
          editable={!loading}
          placeholderTextColor={Colors.textSecondary}
          placeholder="guardian@email.com"
        />

        {/* Password field */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={[styles.input, passwordFocused && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
          editable={!loading}
          placeholderTextColor={Colors.textSecondary}
          placeholder="••••••••"
        />

        {/* Sign In CTA */}
        <PrimaryButton
          title="Sign In 🔐"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 16 }}
          accessibilityLabel="Sign in"
          accessibilityHint="Sign in to your guardian account"
        />

        {/* Register link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>New here? </Text>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    height: 220,
    backgroundColor: Colors.blueLight,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  backBtn: {
    marginBottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.sm,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  mascotRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  mascotCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.blueLight,
    ...Shadows.blue,
  },
  mascotImage: {
    width: 58,
    height: 58,
  },
  heading: {
    fontFamily: Typography.bold,
    fontSize: FontSize["3xl"],
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: Typography.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
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
    ...Shadows.blue,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  linkLabel: {
    fontFamily: Typography.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  link: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.orange,
  },
});
