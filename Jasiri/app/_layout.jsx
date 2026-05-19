import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { setAudioModeAsync } from "expo-audio";
import * as Sentry from "@sentry/react-native";
import "../global.css";
import useAuthStore from "../src/store/useAuthStore";
import useChildStore from "../src/store/useChildStore";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { initErrorReporting } from "../src/services/errorReporting";

// Keep splash visible while fonts and auth bootstrap
SplashScreen.preventAutoHideAsync();

// Initialise error reporting as early as possible
initErrorReporting();

/**
 * Root layout with font loading + auth guard.
 *
 * Boot sequence:
 *  1. Load Poppins font family (design system requirement)
 *  2. Bootstrap auth (checks stored token → /me call)
 *  3. If authenticated, loads children from cache
 *  4. Protects guarded routes behind auth
 *  5. Initializes audio system ONCE for the app lifetime
 */
function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const loadChildren = useChildStore((s) => s.loadChildren);

  // Load the full Poppins family — covers all brand typography needs
  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
  });

  // Hide splash once fonts are ready (or on error — degrade gracefully)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize audio system exactly once for the app lifetime
  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      // Non-fatal — audio feedback degrades gracefully
    });
  }, []);

  // Bootstrap auth on mount
  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load children whenever auth state becomes true
  useEffect(() => {
    if (isAuthenticated) {
      loadChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const currentSegment = segments[0] ?? "";

  // Navigation guard — runs after bootstrapping finishes.
  // Uses a PUBLIC allowlist so any new protected route is guarded automatically.
  const PUBLIC_SEGMENTS = new Set(["", "welcome", "(auth)"]);

  useEffect(() => {
    if (isBootstrapping) return;

    const inPublicRoute = PUBLIC_SEGMENTS.has(currentSegment);

    if (!isAuthenticated && !inPublicRoute) {
      router.replace("/(auth)/login");
    }
  }, [isBootstrapping, isAuthenticated, currentSegment]);

  // Block render until fonts are loaded — prevents FOUT on child screens
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Show branded loading indicator while auth bootstraps
  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFF9F2",
        }}
      >
        <ActivityIndicator size="large" color="#FF8A3D" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}

// Wrap with Sentry for automatic touch event tracking and tracing
export default Sentry.wrap(RootLayout);
