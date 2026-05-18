/* eslint-disable react/no-unescaped-entities */
/**
 * Parent Dashboard Component
 * Administrative interface for parents and caregivers
 * Features: Progress tracking, settings, content management
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import * as Speech from "expo-speech";
import { AccessibleButton } from "./AccessibleButton";
import { AccessibleTextInput } from "./AccessibleInput";
import { useTheme } from "../theme/ThemeProvider";
import { useFeedback } from "../hooks/useFeedback";

const { width } = Dimensions.get("window");

export function ParentDashboard({ onNavigate, childData = {} }) {
  const { theme } = useTheme();
  const { successFeedback, buttonFeedback } = useFeedback();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [childName, setChildName] = useState(childData.name || "");

  const tabs = [
    { id: "overview", title: "Overview", emoji: "📊" },
    { id: "progress", title: "Progress", emoji: "📈" },
    { id: "activities", title: "Activities", emoji: "🎯" },
    { id: "settings", title: "Settings", emoji: "⚙️" },
  ];

  const quickStats = [
    {
      label: "Learning Time Today",
      value: "45 minutes",
      color: theme.colors.blue[400],
    },
    {
      label: "Activities Completed",
      value: "3 of 5",
      color: theme.colors.green[400],
    },
    {
      label: "Favorite Activity",
      value: "Number Games",
      color: theme.colors.purple[400],
    },
    { label: "Success Rate", value: "85%", color: theme.colors.yellow[400] },
  ];

  const recentActivities = [
    { name: "Counting to 10", completed: true, time: "10 min", score: "90%" },
    {
      name: "Letter Recognition",
      completed: true,
      time: "15 min",
      score: "75%",
    },
    { name: "Color Matching", completed: false, time: "0 min", score: "--" },
    { name: "Shape Sorting", completed: true, time: "20 min", score: "95%" },
  ];

  const handleBackToChild = () => {
    buttonFeedback("Returning to child dashboard");
    Speech.speak("Returning to child dashboard", {
      language: "en",
      pitch: 1.0,
      rate: 0.9,
    });
    if (onNavigate) {
      onNavigate("child");
    }
  };

  const handleTabPress = (tabId) => {
    buttonFeedback(tabs.find((t) => t.id === tabId)?.title);
    setActiveTab(tabId);
  };

  const renderOverview = () => (
    <ScrollView style={{ flex: 1 }}>
      {/* Welcome Section */}
      <View
        style={{
          backgroundColor: theme.colors.primary[50],
          margin: theme.spacing[4],
          padding: theme.spacing[6],
          borderRadius: theme.borderRadius.xl,
          borderColor: theme.colors.primary[200],
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes["2xl"],
            fontWeight: "bold",
            color: theme.colors.primary[700],
            marginBottom: theme.spacing[2],
          }}
        >
          Welcome to Parent Dashboard
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            color: theme.colors.primary[600],
            marginBottom: theme.spacing[4],
          }}
        >
          Track {childName || "your child"}'s learning progress and customize
          their experience
        </Text>

        <AccessibleButton
          title="⚡ Quick Start Guide"
          variant="primary"
          size="medium"
          onPress={() => {
            Speech.speak(
              "Quick start guide: Use the tabs below to navigate between overview, progress tracking, activity management, and settings. The child dashboard features large cards optimized for Down syndrome users with audio cues and simple navigation.",
              {
                language: "en",
                pitch: 1.0,
                rate: 0.85,
              },
            );
          }}
          accessibilityLabel="Play quick start guide"
          accessibilityHint="Audio explanation of dashboard features"
          style={{ alignSelf: "flex-start" }}
        />
      </View>

      {/* Quick Stats */}
      <View style={{ margin: theme.spacing[4] }}>
        <Text
          style={{
            fontSize: theme.fontSizes.xl,
            fontWeight: "bold",
            color: theme.colors.gray[800],
            marginBottom: theme.spacing[4],
          }}
        >
          Today's Summary
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {quickStats.map((stat, index) => (
            <View
              key={index}
              style={{
                width: (width - theme.spacing[4] * 3) / 2,
                backgroundColor: stat.color,
                padding: theme.spacing[4],
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing[3],
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSizes["2xl"],
                  fontWeight: "bold",
                  color: theme.colors.white,
                  marginBottom: theme.spacing[1],
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.sm,
                  color: theme.colors.white,
                  textAlign: "center",
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activities */}
      <View style={{ margin: theme.spacing[4] }}>
        <Text
          style={{
            fontSize: theme.fontSizes.xl,
            fontWeight: "bold",
            color: theme.colors.gray[800],
            marginBottom: theme.spacing[4],
          }}
        >
          Recent Activities
        </Text>

        {recentActivities.map((activity, index) => (
          <View
            key={index}
            style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing[4],
              marginBottom: theme.spacing[3],
              borderRadius: theme.borderRadius.lg,
              borderColor: theme.colors.gray[200],
              borderWidth: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.fontSizes.lg,
                    fontWeight: "bold",
                    color: theme.colors.gray[800],
                    marginBottom: theme.spacing[1],
                  }}
                >
                  {activity.name}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSizes.sm,
                    color: theme.colors.gray[600],
                  }}
                >
                  Time: {activity.time} | Score: {activity.score}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: activity.completed
                    ? theme.colors.green[100]
                    : theme.colors.gray[100],
                  paddingHorizontal: theme.spacing[3],
                  paddingVertical: theme.spacing[2],
                  borderRadius: theme.borderRadius.full,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.fontSizes.sm,
                    fontWeight: "bold",
                    color: activity.completed
                      ? theme.colors.green[700]
                      : theme.colors.gray[600],
                  }}
                >
                  {activity.completed ? "Completed" : "Pending"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderProgress = () => (
    <ScrollView style={{ flex: 1, padding: theme.spacing[4] }}>
      <Text
        style={{
          fontSize: theme.fontSizes.xl,
          fontWeight: "bold",
          color: theme.colors.gray[800],
          marginBottom: theme.spacing[6],
        }}
      >
        Learning Progress Tracking
      </Text>

      {/* Progress Charts Placeholder */}
      <View
        style={{
          backgroundColor: theme.colors.blue[50],
          padding: theme.spacing[6],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[6],
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes["6xl"],
            marginBottom: theme.spacing[4],
          }}
        >
          📊
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: "bold",
            color: theme.colors.blue[700],
            marginBottom: theme.spacing[2],
          }}
        >
          Progress Charts Coming Soon
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.blue[600],
            textAlign: "center",
          }}
        >
          Visual progress tracking with charts and detailed analytics will be
          available in the next update.
        </Text>
      </View>

      {/* Weekly Goals */}
      <View
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.lg,
          borderColor: theme.colors.gray[200],
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: "bold",
            color: theme.colors.gray[800],
            marginBottom: theme.spacing[4],
          }}
        >
          Weekly Goals
        </Text>

        <View style={{ marginBottom: theme.spacing[3] }}>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
            }}
          >
            Complete 5 learning activities
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.gray[200],
              height: 8,
              borderRadius: 4,
              marginTop: theme.spacing[2],
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.green[400],
                width: "60%",
                height: 8,
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        <View style={{ marginBottom: theme.spacing[3] }}>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
            }}
          >
            Spend 3 hours learning
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.gray[200],
              height: 8,
              borderRadius: 4,
              marginTop: theme.spacing[2],
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.blue[400],
                width: "80%",
                height: 8,
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderActivities = () => (
    <ScrollView style={{ flex: 1, padding: theme.spacing[4] }}>
      <Text
        style={{
          fontSize: theme.fontSizes.xl,
          fontWeight: "bold",
          color: theme.colors.gray[800],
          marginBottom: theme.spacing[6],
        }}
      >
        Activity Management
      </Text>

      <AccessibleButton
        title="🎮 Customize Game Settings"
        variant="primary"
        size="large"
        onPress={() => successFeedback("Game settings customization")}
        accessibilityLabel="Customize game settings"
        accessibilityHint="Modify difficulty levels and game preferences"
        style={{ marginBottom: theme.spacing[4] }}
      />

      <AccessibleButton
        title="📚 Manage Story Content"
        variant="secondary"
        size="large"
        onPress={() => successFeedback("Story content management")}
        accessibilityLabel="Manage story content"
        accessibilityHint="Add or remove stories from the library"
        style={{ marginBottom: theme.spacing[4] }}
      />

      <AccessibleButton
        title="🎵 Audio Preferences"
        variant="success"
        size="large"
        onPress={() => successFeedback("Audio preferences")}
        accessibilityLabel="Audio preferences"
        accessibilityHint="Adjust audio settings and voice preferences"
        style={{ marginBottom: theme.spacing[4] }}
      />

      <AccessibleButton
        title="📊 Export Progress Report"
        variant="warning"
        size="large"
        onPress={() => successFeedback("Progress report export")}
        accessibilityLabel="Export progress report"
        accessibilityHint="Generate and export detailed progress report"
        style={{ marginBottom: theme.spacing[4] }}
      />
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={{ flex: 1, padding: theme.spacing[4] }}>
      <Text
        style={{
          fontSize: theme.fontSizes.xl,
          fontWeight: "bold",
          color: theme.colors.gray[800],
          marginBottom: theme.spacing[6],
        }}
      >
        Settings & Preferences
      </Text>

      <View
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing[4],
          borderColor: theme.colors.gray[200],
          borderWidth: 1,
        }}
      >
        <AccessibleTextInput
          label="Child's Name"
          value={childName}
          onChangeText={setChildName}
          placeholder="Enter child's name"
          accessibilityLabel="Child name input"
          accessibilityHint="Enter or update the child's name for personalization"
          style={{ marginBottom: theme.spacing[4] }}
        />

        <AccessibleButton
          title="Save Name"
          variant="primary"
          size="medium"
          onPress={() => {
            successFeedback(`Name updated to ${childName}`);
            Speech.speak(`Child's name updated to ${childName}`, {
              language: "en",
              pitch: 1.0,
              rate: 0.9,
            });
          }}
          accessibilityLabel="Save child name"
          accessibilityHint="Save the updated child name"
          style={{ alignSelf: "flex-start" }}
        />
      </View>

      <View
        style={{
          backgroundColor: theme.colors.yellow[50],
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing[4],
          borderColor: theme.colors.yellow[200],
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: "bold",
            color: theme.colors.yellow[800],
            marginBottom: theme.spacing[2],
          }}
        >
          Accessibility Features
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.yellow[700],
            marginBottom: theme.spacing[4],
          }}
        >
          All accessibility features are automatically optimized for Down
          syndrome users, including:
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.sm,
            color: theme.colors.yellow[700],
            lineHeight: 20,
          }}
        >
          • Large touch targets (minimum 48px){"\n"}• High contrast colors{"\n"}
          • Audio feedback for all interactions{"\n"}• Simple, clear navigation
          {"\n"}• Reduced cognitive load{"\n"}• Consistent interface patterns
        </Text>
      </View>

      <AccessibleButton
        title="🔄 Reset All Settings"
        variant="danger"
        size="medium"
        onPress={() => {
          successFeedback("Settings reset to defaults");
          Speech.speak("All settings have been reset to default values", {
            language: "en",
            pitch: 1.0,
            rate: 0.9,
          });
        }}
        accessibilityLabel="Reset all settings"
        accessibilityHint="Reset all customizations to default values"
        style={{ alignSelf: "flex-start" }}
      />
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "progress":
        return renderProgress();
      case "activities":
        return renderActivities();
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.gray[50] }}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "default"}
        backgroundColor={theme.colors.gray[800]}
      />

      {/* Header */}
      <View
        style={{
          backgroundColor: theme.colors.gray[800],
          paddingTop: Platform.OS === "ios" ? 50 : 30,
          paddingHorizontal: theme.spacing[4],
          paddingBottom: theme.spacing[4],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: theme.fontSizes["2xl"],
                fontWeight: "bold",
                color: theme.colors.white,
                marginBottom: theme.spacing[1],
              }}
            >
              Parent Dashboard
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[300],
              }}
            >
              Monitor and customize learning experience
            </Text>
          </View>

          <AccessibleButton
            title="← Back to Child"
            onPress={handleBackToChild}
            accessibilityLabel="Return to child dashboard"
            accessibilityHint="Switch back to child learning interface"
            style={{
              backgroundColor: theme.colors.primary[500],
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[2],
              borderRadius: theme.borderRadius.lg,
            }}
            textStyle={{
              fontSize: theme.fontSizes.sm,
              color: theme.colors.white,
            }}
          />
        </View>
      </View>

      {/* Tab Navigation */}
      <View
        style={{
          backgroundColor: theme.colors.white,
          flexDirection: "row",
          paddingHorizontal: theme.spacing[2],
          paddingVertical: theme.spacing[2],
          borderBottomColor: theme.colors.gray[200],
          borderBottomWidth: 1,
        }}
      >
        {tabs.map((tab) => (
          <AccessibleButton
            key={tab.id}
            title={`${tab.emoji} ${tab.title}`}
            onPress={() => handleTabPress(tab.id)}
            accessibilityLabel={`${tab.title} tab`}
            accessibilityHint={`Switch to ${tab.title} view`}
            style={{
              flex: 1,
              marginHorizontal: theme.spacing[1],
              backgroundColor:
                activeTab === tab.id
                  ? theme.colors.primary[100]
                  : "transparent",
              borderColor:
                activeTab === tab.id
                  ? theme.colors.primary[300]
                  : theme.colors.gray[200],
              borderWidth: 1,
              borderRadius: theme.borderRadius.lg,
              paddingVertical: theme.spacing[2],
            }}
            textStyle={{
              fontSize: theme.fontSizes.sm,
              color:
                activeTab === tab.id
                  ? theme.colors.primary[700]
                  : theme.colors.gray[600],
              fontWeight: activeTab === tab.id ? "bold" : "normal",
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>
    </View>
  );
}
