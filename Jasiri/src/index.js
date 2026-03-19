/**
 * Accessibility-First Design System
 * Export all components and utilities
 */

// Theme System
export {
  default as accessibilityTheme,
  themeVariants,
} from "./theme/accessibility.js";
export {
  ThemeProvider,
  useTheme,
  useAccessibility,
} from "./theme/ThemeProvider.jsx";

// Audio & Haptic Feedback
export {
  useAudioFeedback,
  useHapticFeedback,
  useSpeech,
  useFeedback,
  AUDIO_TYPES,
  HAPTIC_TYPES,
} from "./hooks/useFeedback.js";

// Form Components
export {
  AccessibleButton,
  AccessibleFAB,
  AccessibleIconButton,
} from "./components/AccessibleButton.jsx";

export {
  AccessibleTextInput,
  AccessibleCheckbox,
  AccessibleRadioButton,
  AccessibleSwitch,
} from "./components/AccessibleInput.jsx";

// Navigation Components
export {
  AccessibleTabBar,
  AccessibleHeader,
  AccessibleDrawerItem,
  AccessibleBreadcrumb,
  AccessibleBottomSheet,
} from "./navigation/AccessibleNavigation.jsx";

// Dashboard Components
export { ChildDashboard } from "./components/ChildDashboard.jsx";
export { ParentDashboard } from "./components/ParentDashboard.jsx";
export { DashboardShell } from "./components/DashboardShell.jsx";
