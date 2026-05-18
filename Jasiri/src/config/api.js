/**
 * API Configuration
 *
 * Derives the backend base URL from the Expo dev server host so the app
 * works on both emulators and physical devices without manual changes.
 *
 * Production: set EXPO_PUBLIC_API_URL in your environment / EAS secrets.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveBaseUrl() {
  // EAS / production build
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Expo Go / dev: hostUri is "192.168.x.x:8081" — swap port to 3000
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  // Android emulator fallback
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  // iOS simulator fallback
  return "http://localhost:3000";
}

export const API_BASE_URL = resolveBaseUrl();
export const API_VERSION = "v1";
export const API_PREFIX = `${API_BASE_URL}/api/${API_VERSION}`;
