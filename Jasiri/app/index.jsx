import {
  AccessibleButton,
  AccessibleHeader,
  AccessibleTextInput,
  ThemeProvider,
  useFeedback,
  useTheme,
} from "@/src";
import { Platform, StatusBar, Text, View } from "react-native";
import { useRouter } from "expo-router";

// Demo screen to showcase accessibility features
function DemoScreen() {
  const { theme } = useTheme();
  const { successFeedback, buttonFeedback } = useFeedback();
  const router = useRouter();

  // Add safety check for theme object
  if (!theme || !theme.colors || !theme.spacing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ fontSize: 18, color: "#000000" }}>Loading theme...</Text>
      </View>
    );
  }

  const handleWelcomePress = () => {
    successFeedback("Welcome to Jasiri Learning App!");
  };

  const handleExplorePress = () => {
    buttonFeedback("Explore features");
  };

  const handleDashboardPress = () => {
    buttonFeedback("Opening Dashboard");
    router.push("/dashboard");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.accessibility.background,
      }}
    >
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "default"}
        backgroundColor={theme.colors.primary[500]}
      />

      <AccessibleHeader
        title="Jasiri Learning"
        subtitle="Assistive Education for Every Child"
        backgroundColor={theme.colors.primary[500]}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing[6],
          paddingVertical: theme.spacing[8],
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View style={{ width: "100%", maxWidth: 400 }}>
          <AccessibleButton
            title="Welcome to Jasiri!"
            variant="primary"
            size="large"
            onPress={handleWelcomePress}
            accessibilityLabel="Welcome button"
            accessibilityHint="Plays welcome message with audio feedback"
            style={{
              marginBottom: theme.spacing[6],
              alignSelf: "stretch",
            }}
          />

          <AccessibleButton
            title="Explore Features"
            variant="secondary"
            size="large"
            onPress={handleExplorePress}
            accessibilityLabel="Explore app features"
            accessibilityHint="Navigate to features overview"
            style={{
              marginBottom: theme.spacing[6],
              alignSelf: "stretch",
            }}
          />

          <AccessibleButton
            title="🏠 Go to Dashboard"
            variant="primary"
            size="large"
            onPress={handleDashboardPress}
            accessibilityLabel="Go to child dashboard"
            accessibilityHint="Navigate to the main dashboard optimized for children with Down syndrome"
            style={{
              marginBottom: theme.spacing[6],
              alignSelf: "stretch",
              backgroundColor: theme.colors.purple[500],
            }}
          />

          <AccessibleTextInput
            label="What's your name?"
            placeholder="Enter your name here"
            accessibilityLabel="Name input field"
            accessibilityHint="Type your name to personalize your learning experience"
            style={{
              marginBottom: theme.spacing[4],
            }}
          />

          <View
            style={{
              backgroundColor: theme.colors.success[50],
              padding: theme.spacing[4],
              borderRadius: theme.borderRadius.lg,
              borderColor: theme.colors.success[200],
              borderWidth: 1,
            }}
          >
            <AccessibleButton
              title="Start Learning Journey"
              variant="success"
              size="extraLarge"
              onPress={() =>
                successFeedback(
                  "Let's begin your personalized learning adventure!",
                )
              }
              accessibilityLabel="Start learning journey"
              accessibilityHint="Begin your personalized learning experience with audio guidance"
              style={{
                alignSelf: "stretch",
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// Main App with Accessibility Provider
export default function Index() {
  return (
    <ThemeProvider>
      <DemoScreen />
    </ThemeProvider>
  );
}
