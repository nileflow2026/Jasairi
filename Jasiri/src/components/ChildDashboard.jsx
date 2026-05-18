/**
 * Child Dashboard Component
 * Optimized for children with Down syndrome
 * Features: Large cards, simple layouts, audio cues, minimal distractions
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
import { useTheme } from "../theme/ThemeProvider";
import { useFeedback } from "../hooks/useFeedback";

const { width, height } = Dimensions.get("window");

export function ChildDashboard({ onNavigate, childName = "Champion" }) {
  const { theme } = useTheme();
  const { successFeedback, buttonFeedback } = useFeedback();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = "";

    if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour < 17) {
      timeGreeting = "Good afternoon";
    } else {
      timeGreeting = "Good evening";
    }

    const fullGreeting = `${timeGreeting}, ${childName}!`;
    setGreeting(fullGreeting);

    // Welcome audio on load — cleaned up if component unmounts before 1 s
    const timer = setTimeout(() => {
      Speech.stop();
      Speech.speak(`${fullGreeting} Welcome to your learning dashboard!`, {
        language: "en",
        pitch: 1.0,
        rate: 0.8,
      });
    }, 1000);
    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, [childName]);

  const dashboardCards = useMemo(() => [
    {
      id: "games",
      title: "Play Games",
      emoji: "🎮",
      color: theme.colors.primary[400],
      description: "Memory game",
      audioText: "Play educational games and have fun learning",
      route: { path: "games", game: "memory" },
    },
    {
      id: "stories",
      title: "Listen to Stories",
      emoji: "📚",
      color: theme.colors.success[400],
      description: "Listen to stories",
      audioText: "Listen to a story made for you",
      route: { path: "stories" },
    },
    {
      id: "music",
      title: "Music & Songs",
      emoji: "🎵",
      color: theme.colors.warning[400],
      description: "Listen to songs",
      audioText: "Listen to music and sing along",
      route: { path: "music" },
    },
    {
      id: "art",
      title: "Create Art",
      emoji: "🎨",
      color: theme.colors.purple[400],
      description: "Memory game",
      audioText: "Play the memory game and find the pairs",
      route: { path: "games", game: "memory" },
    },
    {
      id: "numbers",
      title: "Learn Numbers",
      emoji: "🔢",
      color: theme.colors.blue[400],
      description: "Matching game",
      audioText: "Play the matching game and practice choosing the right answer",
      route: { path: "games", game: "matching" },
    },
    {
      id: "letters",
      title: "Learn Letters",
      emoji: "🔤",
      color: theme.colors.green[400],
      description: "Sequencing game",
      audioText: "Play the sequencing game and practice order and routine",
      route: { path: "games", game: "sequencing" },
    },
  ], [theme.colors]);

  const handleCardPress = useCallback((card) => {
    buttonFeedback(card.title);
    // Stop any in-progress speech before starting a new one
    Speech.stop();
    Speech.speak(card.audioText, {
      language: "en",
      pitch: 1.0,
      rate: 0.8,
    });
    // Navigate immediately — TTS plays in the background
    if (onNavigate) {
      onNavigate(card.route);
    }
  }, [onNavigate, buttonFeedback]);

  const handleParentAccess = () => {
    Speech.speak("Switching to parent dashboard", {
      language: "en",
      pitch: 1.0,
      rate: 0.9,
    });
    if (onNavigate) {
      onNavigate("parent");
    }
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

      {/* Header */}
      <View
        style={{
          backgroundColor: theme.colors.primary[500],
          paddingTop: Platform.OS === "ios" ? 50 : 30,
          paddingHorizontal: theme.spacing[6],
          paddingBottom: theme.spacing[6],
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes["3xl"],
            fontWeight: "bold",
            color: theme.colors.white,
            textAlign: "center",
            marginBottom: theme.spacing[2],
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            color: theme.colors.primary[100],
            textAlign: "center",
          }}
        >
          What would you like to do today?
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing[6],
          paddingTop: theme.spacing[8],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Cards Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: theme.spacing[4],
          }}
        >
          {dashboardCards.map((card) => (
            <AccessibleButton
              key={card.id}
              onPress={() => handleCardPress(card)}
              accessibilityLabel={`${card.title} button`}
              accessibilityHint={card.description}
              style={{
                width: (width - theme.spacing[6] * 2 - theme.spacing[4]) / 2,
                height: 160,
                backgroundColor: card.color,
                borderRadius: theme.borderRadius.xl,
                marginBottom: theme.spacing[4],
                padding: theme.spacing[4],
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 48,
                  marginBottom: theme.spacing[2],
                }}
              >
                {card.emoji}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.lg,
                  fontWeight: "bold",
                  color: theme.colors.white,
                  textAlign: "center",
                  marginBottom: theme.spacing[1],
                }}
              >
                {card.title}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.sm,
                  color: theme.colors.white,
                  textAlign: "center",
                  opacity: 0.9,
                }}
              >
                {card.description}
              </Text>
            </AccessibleButton>
          ))}
        </View>

        {/* Quick Actions */}
        <View
          style={{
            marginTop: theme.spacing[8],
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[6],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.xl,
              fontWeight: "bold",
              color: theme.colors.gray[800],
              textAlign: "center",
              marginBottom: theme.spacing[6],
            }}
          >
            Quick Actions
          </Text>

          <AccessibleButton
            title="🔊 Hear This Page Again"
            variant="secondary"
            size="large"
            onPress={() => {
              Speech.speak(
                `${greeting} Welcome to your learning dashboard! Choose from games, stories, music, art, numbers, or letters to start learning.`,
                {
                  language: "en",
                  pitch: 1.0,
                  rate: 0.8,
                },
              );
            }}
            accessibilityLabel="Repeat page audio"
            accessibilityHint="Listen to the page description again"
            style={{
              marginBottom: theme.spacing[4],
              backgroundColor: theme.colors.blue[400],
            }}
          />

          <AccessibleButton
            title="⏸️ Take a Break"
            variant="secondary"
            size="large"
            onPress={() => {
              Speech.speak(
                "Great job learning! Take a rest and come back when you are ready.",
                {
                  language: "en",
                  pitch: 1.0,
                  rate: 0.8,
                },
              );
            }}
            accessibilityLabel="Take a break"
            accessibilityHint="Pause learning activities"
            style={{
              backgroundColor: theme.colors.green[400],
            }}
          />
        </View>
      </ScrollView>

      {/* Parent Access Button (Hidden/Subtle) */}
      <View
        style={{
          position: "absolute",
          bottom: theme.spacing[4],
          right: theme.spacing[4],
        }}
      >
        <AccessibleButton
          title="👨‍👩‍👧‍👦"
          onPress={handleParentAccess}
          accessibilityLabel="Parent dashboard access"
          accessibilityHint="Switch to parent view"
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.gray[600],
            opacity: 0.7,
            justifyContent: "center",
            alignItems: "center",
          }}
          textStyle={{
            fontSize: 24,
          }}
        />
      </View>
    </View>
  );
}
