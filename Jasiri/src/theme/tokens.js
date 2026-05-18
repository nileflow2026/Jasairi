/**
 * JASIRI Design Tokens
 *
 * Single source of truth for all design values.
 * Use these in StyleSheet.create() contexts (animations, shadows, platform-specific styles).
 * For NativeWind (JSX className), use the tailwind.config.js jasiri.* tokens instead.
 *
 * Philosophy: calm, accessible, warm, playful — not clinical or corporate.
 */

// ─────────────────────────────────────────────────────────────────────────────
// COLOR TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // Brand primaries
  orange: "#FF8A3D", // Primary Orange — warmth, CTAs, energy
  blue: "#5BB9FF", // Calm Sky Blue — trust, headers, calm states
  green: "#63C174", // Ubuntu Green — progress, success, growth
  yellow: "#FFD65A", // Friendly Yellow — rewards, delight, highlights
  lavender: "#B79CFF", // Lavender Accent — creativity, art studio

  // Backgrounds
  background: "#FFF9F2", // Main screen background — warm off-white
  surface: "#FFFFFF", // Cards, inputs, modals

  // Text
  textPrimary: "#2D3748", // Primary readable text
  textSecondary: "#718096", // Supporting / muted text
  textOnDark: "#FFFFFF", // Text on dark/colored backgrounds

  // Extended shades (tints & shades for states)
  orangeLight: "#FFE4CC",
  orangeDark: "#E86A1E",
  blueLight: "#D6EFFF",
  blueDark: "#2E8FCC",
  greenLight: "#D4F0D9",
  greenDark: "#3A8A4A",
  yellowLight: "#FFF5CC",
  yellowDark: "#E6B800",
  lavenderLight: "#EDE8FF",
  lavenderDark: "#7C5DE0",

  // Semantic states
  error: "#EF4444",
  errorLight: "#FEE2E2",
  errorDark: "#C62828",
  warning: "#FFD65A",
  warningLight: "#FFF5CC",
  success: "#63C174",
  successLight: "#D4F0D9",

  // UI chrome
  border: "#E8E0F0",
  divider: "#F0EBF8",
  overlay: "rgba(45, 55, 72, 0.5)",
  overlayLight: "rgba(45, 55, 72, 0.08)",

  // Pure
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

export const Typography = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semibold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
};

export const FontSize = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
  "6xl": 48,
};

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────────────────────────────────────

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
};

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  full: 9999,
};

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS — Warm, soft, platform-ready
// ─────────────────────────────────────────────────────────────────────────────

export const Shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Brand-tinted shadows for CTAs
  orange: {
    shadowColor: "#FF8A3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  blue: {
    shadowColor: "#5BB9FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  green: {
    shadowColor: "#63C174",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  lavender: {
    shadowColor: "#B79CFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOUCH TARGETS — WCAG 2.5.5 compliance
// ─────────────────────────────────────────────────────────────────────────────

export const TouchTarget = {
  minimum: 44, // iOS minimum
  recommended: 56, // Android + motor accessibility
  comfortable: 64, // Comfortable for all users
  large: 72, // For motor difficulties
  extraLarge: 80, // Maximum comfort for young children
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION — Calm, not jarring. Reduce motion support built-in.
// ─────────────────────────────────────────────────────────────────────────────

export const Animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
    entrance: 500,
  },
  // React Native Animated spring presets
  spring: {
    bouncy: { friction: 5, tension: 80 }, // For mascots, rewards
    gentle: { friction: 8, tension: 60 }, // For cards, content
    snappy: { friction: 10, tension: 100 }, // For buttons, quick feedback
    wobbly: { friction: 4, tension: 50 }, // For celebrations
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY PALETTE — Colors used for game/activity cards
// Each child sees consistent color associations across sessions.
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityPalette = [
  { accent: "#5BB9FF", light: "#D6EFFF", dark: "#2E8FCC" }, // Sky blue
  { accent: "#FF8A3D", light: "#FFE4CC", dark: "#E86A1E" }, // Orange
  { accent: "#63C174", light: "#D4F0D9", dark: "#3A8A4A" }, // Green
  { accent: "#FFD65A", light: "#FFF5CC", dark: "#E6B800" }, // Yellow
  { accent: "#B79CFF", light: "#EDE8FF", dark: "#7C5DE0" }, // Lavender
  { accent: "#F06292", light: "#FCE4EC", dark: "#C2185B" }, // Pink
];

export default {
  Colors,
  Typography,
  FontSize,
  LineHeight,
  Spacing,
  Radius,
  Shadows,
  TouchTarget,
  Animation,
  ActivityPalette,
};
