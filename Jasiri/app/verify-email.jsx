/* eslint-disable react/no-unescaped-entities */
/**
 * Verify Email Screen
 *
 * Shown immediately after registration.
 * Prompts the guardian to enter the 6-digit OTP sent to their email.
 * On success, updates isVerified in both Appwrite and the guardian document.
 */

import React, { useState, useRef, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { authService } from "../src/services/authService";
import useAuthStore from "../src/store/useAuthStore";
import {
  Colors,
  Typography,
  FontSize,
  Radius,
  Shadows,
} from "../src/theme/tokens";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const setUser = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.bootstrap);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpRef = useRef(null);

  // Start resend cooldown on mount (email was just sent during registration)
  useEffect(() => {
    startCooldown(60);
  }, []);

  const startCooldown = (seconds) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      shake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.verifyEmail(otp.trim());
      // Refresh the auth store so isVerified: true is reflected app-wide
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      // Brief celebration then navigate forward
      setTimeout(() => {
        router.replace("/select-profile");
      }, 1200);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        err.status === 400
          ? "Invalid or expired code. Please try again or resend."
          : err.isNetworkError
            ? "Cannot connect. Check your connection."
            : err.message || "Verification failed. Please try again.",
      );
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      await authService.sendVerification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startCooldown(60);
    } catch (err) {
      setError(
        err.isNetworkError
          ? "Cannot connect. Check your connection."
          : "Failed to resend code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  const handleSkip = () => {
    // Guardian can proceed without verifying for now; isVerified stays false.
    // Some features may be gated on isVerified in the future.
    router.replace("/select-profile");
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.arch} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <View style={styles.mascotCircle}>
            <Image
              source={require("../assets/images/mascot-welcome.png")}
              style={styles.mascotImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading} accessibilityRole="header">
          {success ? "Email verified! 🎉" : "Check your email 📬"}
        </Text>
        <Text style={styles.subheading}>
          {success
            ? "Your account is now verified. Setting things up…"
            : `We sent a 6-digit code to\n${email || "your email address"}`}
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

        {/* Success banner */}
        {success ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✅ Your email has been verified successfully!
            </Text>
          </View>
        ) : null}

        {!success && (
          <>
            {/* OTP input */}
            <Text style={styles.label}>Enter the 6-digit code</Text>
            <TextInput
              ref={otpRef}
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => {
                // Only allow digits, max 6
                const cleaned = v.replace(/[^0-9]/g, "").slice(0, 6);
                setOtp(cleaned);
              }}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              accessibilityLabel="Verification code"
              accessibilityHint="Enter the 6 digit code from your email"
              editable={!loading}
              placeholder="000000"
              placeholderTextColor={Colors.textSecondary}
              maxLength={6}
              autoFocus
            />

            {/* Verify button */}
            <Pressable
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
              style={[
                styles.ctaButton,
                (loading || otp.length !== 6) && styles.ctaButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Verify email"
              accessibilityState={{ disabled: loading || otp.length !== 6 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textOnDark} size="small" />
              ) : (
                <Text style={styles.ctaText}>Verify Email</Text>
              )}
            </Pressable>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <Pressable
                onPress={handleResend}
                disabled={cooldown > 0 || resending}
                accessibilityRole="button"
                accessibilityLabel={
                  cooldown > 0
                    ? `Resend available in ${cooldown} seconds`
                    : "Resend code"
                }
              >
                {resending ? (
                  <ActivityIndicator color={Colors.lavenderDark} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.resendLink,
                      cooldown > 0 && styles.resendLinkDisabled,
                    ]}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Skip */}
            <Pressable
              onPress={handleSkip}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip verification for now"
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </>
        )}
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
    height: 200,
    backgroundColor: Colors.greenLight,
    borderBottomLeftRadius: Radius["4xl"],
    borderBottomRightRadius: Radius["4xl"],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 72 : 56,
    paddingBottom: 48,
    alignItems: "center",
  },
  mascotWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  mascotCircle: {
    width: 92,
    height: 92,
    borderRadius: Radius.full,
    backgroundColor: Colors.green,
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
    lineHeight: FontSize.base * 1.5,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    width: "100%",
  },
  errorText: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.errorDark,
  },
  successBanner: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.success,
    width: "100%",
  },
  successText: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.greenDark,
    textAlign: "center",
  },
  label: {
    fontFamily: Typography.semibold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  otpInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.green,
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: FontSize["4xl"],
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    width: "100%",
    textAlign: "center",
    letterSpacing: 12,
    minHeight: 72,
    ...Shadows.xs,
  },
  ctaButton: {
    marginTop: 24,
    backgroundColor: Colors.green,
    borderRadius: Radius.full,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    ...Shadows.lavender,
  },
  ctaButtonDisabled: {
    backgroundColor: Colors.greenLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: Typography.bold,
    fontSize: FontSize.base,
    color: Colors.textOnDark,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  resendText: {
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontFamily: Typography.bold,
    fontSize: FontSize.sm,
    color: Colors.lavenderDark,
  },
  resendLinkDisabled: {
    color: Colors.textSecondary,
  },
  skipBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontFamily: Typography.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: "underline",
  },
});
