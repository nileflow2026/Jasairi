/**
 * Accessibility Theme Provider
 * Manages theme state and accessibility preferences
 */

import React, { createContext, useContext, useReducer, useEffect } from "react";
import { Appearance, AccessibilityInfo, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { accessibilityTheme, themeVariants } from "./accessibility";

const ThemeContext = createContext();

// Theme actions
const THEME_ACTIONS = {
  SET_THEME_VARIANT: "SET_THEME_VARIANT",
  TOGGLE_HIGH_CONTRAST: "TOGGLE_HIGH_CONTRAST",
  TOGGLE_LARGE_TEXT: "TOGGLE_LARGE_TEXT",
  TOGGLE_REDUCE_MOTION: "TOGGLE_REDUCE_MOTION",
  SET_ACCESSIBILITY_PREFERENCE: "SET_ACCESSIBILITY_PREFERENCE",
  LOAD_PREFERENCES: "LOAD_PREFERENCES",
};

// Initial theme state
const initialState = {
  currentTheme: accessibilityTheme,
  themeVariant: "default",
  preferences: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    audioFeedback: true,
    hapticFeedback: true,
    touchSensitivity: "normal",
  },
  systemPreferences: {
    colorScheme: "light",
    reduceMotionEnabled: false,
    screenReaderEnabled: false,
    boldTextEnabled: false,
  },
};

// Theme reducer
function themeReducer(state, action) {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME_VARIANT:
      return {
        ...state,
        themeVariant: action.payload,
        currentTheme: themeVariants[action.payload] || themeVariants.default,
      };

    case THEME_ACTIONS.TOGGLE_HIGH_CONTRAST:
      const highContrastEnabled = !state.preferences.highContrast;
      const newThemeForContrast = highContrastEnabled
        ? combineThemeVariants(state.themeVariant, "highContrast")
        : themeVariants[state.themeVariant] || themeVariants.default;

      return {
        ...state,
        preferences: {
          ...state.preferences,
          highContrast: highContrastEnabled,
        },
        currentTheme: newThemeForContrast,
      };

    case THEME_ACTIONS.TOGGLE_LARGE_TEXT:
      const largeTextEnabled = !state.preferences.largeText;
      const newThemeForText = largeTextEnabled
        ? combineThemeVariants(state.themeVariant, "largeText")
        : themeVariants[state.themeVariant] || themeVariants.default;

      return {
        ...state,
        preferences: {
          ...state.preferences,
          largeText: largeTextEnabled,
        },
        currentTheme: newThemeForText,
      };

    case THEME_ACTIONS.TOGGLE_REDUCE_MOTION:
      const reduceMotionEnabled = !state.preferences.reduceMotion;
      const newThemeForMotion = reduceMotionEnabled
        ? combineThemeVariants(state.themeVariant, "reducedMotion")
        : themeVariants[state.themeVariant] || themeVariants.default;

      return {
        ...state,
        preferences: {
          ...state.preferences,
          reduceMotion: reduceMotionEnabled,
        },
        currentTheme: newThemeForMotion,
      };

    case THEME_ACTIONS.SET_ACCESSIBILITY_PREFERENCE:
      const newPreferences = {
        ...state.preferences,
        [action.payload.key]: action.payload.value,
      };

      return {
        ...state,
        preferences: newPreferences,
        currentTheme: applyPreferencesToTheme(
          state.themeVariant,
          newPreferences,
        ),
      };

    case THEME_ACTIONS.LOAD_PREFERENCES:
      return {
        ...state,
        preferences: action.payload.preferences,
        systemPreferences: action.payload.systemPreferences,
        currentTheme: applyPreferencesToTheme(
          state.themeVariant,
          action.payload.preferences,
        ),
      };

    default:
      return state;
  }
}

// Helper function to combine theme variants
function combineThemeVariants(baseVariant, additionalVariant) {
  const baseTheme = themeVariants[baseVariant] || themeVariants.default;
  const additionalTheme = themeVariants[additionalVariant];

  if (!additionalTheme) return baseTheme;

  // Deep merge themes, prioritizing additional theme properties
  return {
    ...baseTheme,
    colors: { ...baseTheme.colors, ...additionalTheme.colors },
    typography: { ...baseTheme.typography, ...additionalTheme.typography },
    spacing: { ...baseTheme.spacing, ...additionalTheme.spacing },
    touchTargets: {
      ...baseTheme.touchTargets,
      ...additionalTheme.touchTargets,
    },
    animations: { ...baseTheme.animations, ...additionalTheme.animations },
    accessibility: {
      ...baseTheme.accessibility,
      ...additionalTheme.accessibility,
    },
  };
}

// Apply user preferences to theme
function applyPreferencesToTheme(baseVariant, preferences) {
  let theme = themeVariants[baseVariant] || themeVariants.default;

  if (preferences.highContrast) {
    theme = combineThemeVariants("default", "highContrast");
  }

  if (preferences.largeText) {
    theme = combineThemeVariants(baseVariant, "largeText");
  }

  if (preferences.reduceMotion) {
    theme = combineThemeVariants(baseVariant, "reducedMotion");
  }

  return {
    ...theme,
    accessibility: {
      ...theme.accessibility,
      ...preferences,
    },
  };
}

// Theme Provider Component
export function ThemeProvider({ children }) {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
    loadSystemPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    savePreferences(state.preferences);
  }, [state.preferences]);

  // Load preferences from AsyncStorage
  const loadPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem(
        "@jasiri_accessibility_preferences",
      );
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({
          type: THEME_ACTIONS.LOAD_PREFERENCES,
          payload: {
            preferences,
            systemPreferences: state.systemPreferences,
          },
        });
      }
    } catch (error) {
      console.warn("Failed to load accessibility preferences:", error);
    }
  };

  // Save preferences to AsyncStorage
  const savePreferences = async (preferences) => {
    try {
      await AsyncStorage.setItem(
        "@jasiri_accessibility_preferences",
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.warn("Failed to save accessibility preferences:", error);
    }
  };

  // Load system accessibility preferences
  const loadSystemPreferences = async () => {
    try {
      const systemPreferences = {
        colorScheme: Appearance.getColorScheme(),
        reduceMotionEnabled: false,
        screenReaderEnabled: false,
        boldTextEnabled: false,
      };

      // Check for reduce motion (iOS only)
      if (Platform.OS === "ios") {
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
          systemPreferences.reduceMotionEnabled = enabled;
          updateSystemPreferences(systemPreferences);
        });
      }

      // Check for screen reader
      AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        systemPreferences.screenReaderEnabled = enabled;
        updateSystemPreferences(systemPreferences);
      });

      // Check for bold text (iOS only)
      if (Platform.OS === "ios") {
        AccessibilityInfo.isBoldTextEnabled().then((enabled) => {
          systemPreferences.boldTextEnabled = enabled;
          updateSystemPreferences(systemPreferences);
        });
      }

      updateSystemPreferences(systemPreferences);
    } catch (error) {
      console.warn("Failed to load system preferences:", error);
    }
  };

  const updateSystemPreferences = (systemPreferences) => {
    dispatch({
      type: THEME_ACTIONS.LOAD_PREFERENCES,
      payload: {
        preferences: state.preferences,
        systemPreferences,
      },
    });
  };

  // Theme actions
  const setThemeVariant = (variant) => {
    dispatch({
      type: THEME_ACTIONS.SET_THEME_VARIANT,
      payload: variant,
    });
  };

  const toggleHighContrast = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_HIGH_CONTRAST });
  };

  const toggleLargeText = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_LARGE_TEXT });
  };

  const toggleReduceMotion = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_REDUCE_MOTION });
  };

  const setAccessibilityPreference = (key, value) => {
    dispatch({
      type: THEME_ACTIONS.SET_ACCESSIBILITY_PREFERENCE,
      payload: { key, value },
    });
  };

  // Context value
  const contextValue = {
    // Theme state - Add safety check
    theme: state.currentTheme || accessibilityTheme,
    themeVariant: state.themeVariant,
    preferences: state.preferences,
    systemPreferences: state.systemPreferences,

    // Theme actions
    setThemeVariant,
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion,
    setAccessibilityPreference,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme hook
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Accessibility preference hook
export function useAccessibility() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAccessibility must be used within a ThemeProvider");
  }

  const { preferences, systemPreferences, setAccessibilityPreference } =
    context;

  // Provide safe defaults if preferences are undefined
  const safePreferences = preferences || {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    audioFeedback: true,
    hapticFeedback: true,
    touchSensitivity: "normal",
  };

  const safeSystemPreferences = systemPreferences || {
    colorScheme: "light",
    reduceMotionEnabled: false,
    screenReaderEnabled: false,
    boldTextEnabled: false,
  };

  return {
    preferences: safePreferences,
    systemPreferences: safeSystemPreferences,
    setPreference: setAccessibilityPreference,

    // Convenience getters
    isHighContrast: safePreferences.highContrast,
    isLargeText: safePreferences.largeText,
    isReduceMotion:
      safePreferences.reduceMotion || safeSystemPreferences.reduceMotionEnabled,
    isScreenReaderEnabled: safeSystemPreferences.screenReaderEnabled,
    isBoldTextEnabled: safeSystemPreferences.boldTextEnabled,
    hasAudioFeedback: safePreferences.audioFeedback,
    hasHapticFeedback: safePreferences.hapticFeedback,
  };
}

export default ThemeProvider;
