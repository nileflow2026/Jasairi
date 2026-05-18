/**
 * Accessibility-First Theme Configuration
 * Optimized for children with Down syndrome
 */

export const accessibilityTheme = {
  // Color System - High contrast and colorblind-friendly
  colors: {
    // Primary palette - High contrast blue
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6", // Main primary
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },

    // Secondary palette - Warm orange for engagement
    secondary: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316", // Main secondary
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },

    // Success - High contrast green
    success: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e", // Main success
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
    },

    // Error - High contrast red
    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444", // Main error
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
    },

    // Warning - High contrast amber
    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b", // Main warning
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    // Yellow palette (alias for warning for convenience)
    yellow: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    // Grayscale with high contrast ratios
    gray: {
      50: "#fafafa",
      100: "#f5f5f5",
      200: "#e5e5e5",
      300: "#d4d4d4",
      400: "#a3a3a3",
      500: "#737373",
      600: "#525252",
      700: "#404040",
      800: "#262626",
      900: "#171717",
    },

    // Special accessibility colors
    accessibility: {
      focus: "#0066cc", // WCAG AAA focus indicator
      highContrast: "#000000",
      lowContrast: "#767676",
      background: "#ffffff",
      surface: "#f8fafc",
      overlay: "rgba(0, 0, 0, 0.5)",
    },

    // Purple palette - Adding for completeness
    purple: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7", // Main purple
      600: "#9333ea",
      700: "#7c3aed",
      800: "#6b21a8",
      900: "#581c87",
    },

    // Blue palette (alias for primary for convenience)
    blue: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },

    // Green palette (alias for success for convenience)
    green: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
    },

    // White and black
    white: "#ffffff",
    black: "#000000",
  },

  // Typography - Dyslexia-friendly fonts and sizes
  typography: {
    fonts: {
      // Primary font - OpenDyslexic or system fallback
      primary: "System", // Will fallback to platform default
      secondary: "System",
      mono: "monospace",
    },

    // Font sizes optimized for readability
    sizes: {
      xs: 14, // Minimum readable size
      sm: 16, // Small text
      base: 18, // Base body text (larger than typical)
      lg: 20, // Large text
      xl: 24, // Extra large
      "2xl": 28,
      "3xl": 32,
      "4xl": 36,
      "5xl": 42, // Hero text
      "6xl": 48,
    },

    // Line heights for readability
    lineHeights: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5, // Default - good for dyslexia
      relaxed: 1.625,
      loose: 2,
    },

    // Font weights
    weights: {
      thin: "100",
      light: "300",
      normal: "400", // Default
      medium: "500",
      semibold: "600",
      bold: "700", // For emphasis
      extrabold: "800",
      black: "900",
    },
  },

  // Font sizes shorthand (alias for typography.sizes for component convenience)
  fontSizes: {
    xs: 14,
    sm: 16,
    base: 18,
    lg: 20,
    xl: 24,
    "2xl": 28,
    "3xl": 32,
    "4xl": 36,
    "5xl": 42,
    "6xl": 48,
  },

  // Spacing - Touch-friendly dimensions
  spacing: {
    // Standard spacing scale (in pixels)
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
    12: 48, // Minimum touch target
    14: 56,
    16: 64, // Recommended touch target
    20: 80,
    24: 96,
    28: 112,
    32: 128,
    36: 144,
    40: 160,
    44: 176, // Large touch target
    48: 192,
    52: 208,
    56: 224,
    60: 240,
    64: 256,
    72: 288,
    80: 320,
    96: 384,
  },

  // Touch targets - WCAG AAA compliance
  touchTargets: {
    minimum: 44, // iOS minimum
    recommended: 48, // Android minimum
    comfortable: 56, // Comfortable for all users
    large: 64, // For users with motor difficulties
    extraLarge: 72, // Maximum comfort
  },

  // Border radius for rounded corners
  borderRadius: {
    none: 0,
    sm: 2,
    default: 4,
    md: 6,
    lg: 8,
    xl: 12,
    "2xl": 16,
    "3xl": 24,
    full: 9999,
  },

  // Shadows for depth and focus indicators
  shadows: {
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    default: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 8,
    },
    // Special focus shadow for accessibility
    focus: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 5,
      shadowColor: "#0066cc",
    },
  },

  // Animation durations - Reduced motion support
  animations: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  // Accessibility preferences
  accessibility: {
    // Minimum contrast ratios (WCAG AAA)
    contrastRatios: {
      normal: 7, // AAA for normal text
      large: 4.5, // AAA for large text
      graphics: 3, // AA for graphics
    },

    // Motion preferences
    reduceMotion: false, // Will be set by user preference

    // Audio feedback settings
    audioFeedback: true,
    hapticFeedback: true,

    // Visual feedback settings
    highContrast: false,
    largeText: false,

    // Touch settings
    touchSensitivity: "normal", // 'low' | 'normal' | 'high'
    doubleTapDelay: 300,
    longPressDelay: 500,
  },
};

// Theme variants for different accessibility needs
export const themeVariants = {
  // Default theme
  default: accessibilityTheme,

  // High contrast theme
  highContrast: {
    ...accessibilityTheme,
    colors: {
      ...accessibilityTheme.colors,
      primary: {
        ...accessibilityTheme.colors.primary,
        500: "#0052cc", // Higher contrast blue
      },
      accessibility: {
        ...accessibilityTheme.colors.accessibility,
        background: "#ffffff",
        surface: "#ffffff",
        highContrast: "#000000",
      },
    },
  },

  // Large text theme
  largeText: {
    ...accessibilityTheme,
    typography: {
      ...accessibilityTheme.typography,
      sizes: {
        xs: 16,
        sm: 18,
        base: 20,
        lg: 24,
        xl: 28,
        "2xl": 32,
        "3xl": 36,
        "4xl": 42,
        "5xl": 48,
        "6xl": 56,
      },
    },
    touchTargets: {
      minimum: 48,
      recommended: 56,
      comfortable: 64,
      large: 72,
      extraLarge: 80,
    },
  },

  // Reduced motion theme
  reducedMotion: {
    ...accessibilityTheme,
    animations: {
      fast: 0,
      normal: 0,
      slow: 0,
      slower: 0,
    },
  },
};

export default accessibilityTheme;
