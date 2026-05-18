/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Prevent system dark mode from inverting the child-safe light palette
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── JASIRI Brand System ───────────────────────────────────
        jasiri: {
          orange: "#FF8A3D", // Primary Orange — warmth, energy, CTAs
          blue: "#5BB9FF", // Calm Sky Blue — trust, calm, headers
          green: "#63C174", // Ubuntu Green — progress, success
          yellow: "#FFD65A", // Friendly Yellow — rewards, highlights
          lavender: "#B79CFF", // Lavender Accent — creativity, art
          bg: "#FFF9F2", // Warm off-white background
          text: "#2D3748", // Text Primary — readable, accessible
          muted: "#718096", // Text Secondary — supporting copy
          surface: "#FFFFFF", // Card / input surface

          // Extended palette for states and tints
          "orange-light": "#FFE4CC",
          "orange-dark": "#E86A1E",
          "blue-light": "#D6EFFF",
          "blue-dark": "#2E8FCC",
          "green-light": "#D4F0D9",
          "green-dark": "#3A8A4A",
          "yellow-light": "#FFF5CC",
          "yellow-dark": "#E6B800",
          "lavender-light": "#EDE8FF",
          "lavender-dark": "#7C5DE0",

          // Semantic
          error: "#EF4444",
          "error-light": "#FEE2E2",
          "error-dark": "#C62828",
          border: "#E8E0F0",
          divider: "#F0EBF8",
        },

        // ── Legacy tokens (keep for backward compat) ──────────────
        primary: "#161622",
        secondary: {
          DEFAULT: "#FF9C01",
          100: "#FF9001",
          200: "#FF8E01",
        },
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#CDCDE0",
        },
        beige: {
          100: "#FFF8F0",
        },
      },

      // ── Typography ──────────────────────────────────────────────
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },

      // ── Spacing extras ───────────────────────────────────────────
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        // Touch target sizes
        11: "2.75rem", // 44px min touch target
        14: "3.5rem", // 56px recommended
        // 18 (72px large) already defined above
      },

      // ── Border radius extras ─────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      // ── Font size extras ─────────────────────────────────────────
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
      },
    },
  },
  plugins: [],
};
