import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { reportError } from "../services/errorReporting";

/**
 * App-level React Error Boundary.
 *
 * Catches any unhandled JavaScript errors thrown inside its child tree,
 * reports them via the error reporting service, and renders a calm, accessible
 * fallback screen instead of a blank white crash.
 *
 * Must be a class component — React only supports error boundaries as classes.
 *
 * Accessibility:
 *  - Large touch target on retry button (min 56 px)
 *  - High contrast text on warm background
 *  - Simple, non-alarming copy — calming for caregivers and children
 *
 * @example
 *   <ErrorBoundary>
 *     <YourApp />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
    this._handleRetry = this._handleRetry.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      componentStack: info.componentStack,
      screen: "unknown", // will be enriched by Sentry breadcrumbs in future
    });
  }

  _handleRetry() {
    this.setState({ hasError: false });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji} accessibilityLabel="Oops icon">
          😔
        </Text>

        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.body}>
          We are sorry! The app ran into a problem.{"\n"}
          Please tap the button below to try again.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={this._handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Reload the current screen"
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 22,
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#FF8A3D",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: "center",
    // Accessible shadow for depth cue
    shadowColor: "#FF8A3D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
