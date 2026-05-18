/**
 * Story Hub
 * Simple read-aloud story collection for children
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { AccessibleButton } from "./AccessibleButton";
import { useFeedback } from "../hooks/useFeedback";
import { useTheme } from "../theme/ThemeProvider";

const STORY_LIBRARY = [
  {
    id: "friendship-tree",
    title: "The Little Friendship Tree",
    emoji: "🌳",
    summary: "A story about sharing, helping, and growing together.",
    readAloud:
      "The little tree stood in the garden. One day, a bird asked for a leaf to make a soft nest. The tree said yes. Later, a child asked for shade. The tree said yes again. Each time the tree helped, it felt happy and strong. The tree learned that kindness helps everyone grow.",
  },
  {
    id: "brave-rainbow",
    title: "Mila and the Brave Rainbow",
    emoji: "🌈",
    summary: "A gentle story about trying again after a hard moment.",
    readAloud:
      "Mila saw a rainbow after the rain. She wanted to draw it, but her first picture was not perfect. Mila took a deep breath and tried again. This time she used bright colors and slow careful lines. Her rainbow looked beautiful. Mila smiled because she did not give up.",
  },
  {
    id: "train-ride",
    title: "The Quiet Train Ride",
    emoji: "🚂",
    summary: "A calming story about routines and safe journeys.",
    readAloud:
      "Every morning, the little train rolled through the hills. It stopped at the same places and greeted the same friendly faces. The passengers liked the calm ride. They looked out the window, waved to the clouds, and knew exactly what would happen next. The train helped everyone feel safe and ready for the day.",
  },
];

export function StoryHub() {
  const { theme } = useTheme();
  const { buttonFeedback } = useFeedback();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeStoryId, setActiveStoryId] = useState(STORY_LIBRARY[0].id);

  useEffect(() => {
    const requestedStory = Array.isArray(params.story)
      ? params.story[0]
      : params.story;
    if (
      requestedStory &&
      STORY_LIBRARY.some((story) => story.id === requestedStory)
    ) {
      setActiveStoryId(requestedStory);
    }
  }, [params.story]);

  const activeStory =
    STORY_LIBRARY.find((story) => story.id === activeStoryId) ||
    STORY_LIBRARY[0];

  const speakStory = (story) => {
    buttonFeedback(story.title);
    Speech.speak(`${story.title}. ${story.readAloud}`, {
      language: "en",
      pitch: 1,
      rate: 0.85,
    });
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
        backgroundColor={theme.colors.success[500]}
      />

      <View
        style={{
          backgroundColor: theme.colors.success[500],
          paddingTop: Platform.OS === "ios" ? 56 : 32,
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
          <View style={{ flex: 1, paddingRight: theme.spacing[3] }}>
            <Text
              style={{
                fontSize: theme.fontSizes["2xl"],
                fontWeight: theme.typography.weights.bold,
                color: theme.colors.white,
                marginBottom: theme.spacing[1],
              }}
            >
              Listen to Stories
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.success[100],
              }}
            >
              Calm stories to hear and enjoy.
            </Text>
          </View>

          <AccessibleButton
            title="Back"
            variant="secondary"
            size="medium"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityHint="Return to the previous screen"
            style={{ backgroundColor: theme.colors.white }}
            textStyle={{ color: theme.colors.success[700] }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[4],
          paddingBottom: theme.spacing[8],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: theme.colors.success[50],
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[4],
            marginBottom: theme.spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.success[700],
              marginBottom: theme.spacing[2],
            }}
          >
            Choose a story
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
            }}
          >
            Tap a story card, then press read aloud to hear it.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {STORY_LIBRARY.map((story) => {
            const selected = activeStoryId === story.id;
            return (
              <Pressable
                key={story.id}
                onPress={() => {
                  setActiveStoryId(story.id);
                  buttonFeedback(story.title);
                }}
                accessibilityRole="button"
                accessibilityLabel={story.title}
                accessibilityHint={story.summary}
                style={{
                  width: "100%",
                  minHeight: 120,
                  marginBottom: theme.spacing[3],
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: selected
                    ? theme.colors.success[100]
                    : theme.colors.white,
                  borderWidth: 2,
                  borderColor: selected
                    ? theme.colors.success[500]
                    : theme.colors.gray[200],
                  padding: theme.spacing[4],
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: selected ? theme.colors.success[500] : "#000",
                  shadowOpacity: selected ? 0.22 : 0.06,
                  shadowOffset: { width: 0, height: selected ? 4 : 2 },
                  shadowRadius: selected ? 10 : 4,
                  elevation: selected ? 6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.fontSizes["5xl"],
                    marginRight: theme.spacing[4],
                  }}
                >
                  {story.emoji}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSizes.lg,
                      fontWeight: theme.typography.weights.bold,
                      color: theme.colors.gray[800],
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    {story.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSizes.base,
                      color: theme.colors.gray[600],
                      lineHeight: 24,
                    }}
                  >
                    {story.summary}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[4],
            borderWidth: 1,
            borderColor: theme.colors.gray[200],
            marginTop: theme.spacing[2],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.xl,
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.gray[800],
              marginBottom: theme.spacing[2],
            }}
          >
            {activeStory.title}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
              lineHeight: 26,
              marginBottom: theme.spacing[4],
            }}
          >
            {activeStory.readAloud}
          </Text>

          <AccessibleButton
            title="Read Story Aloud"
            variant="primary"
            size="large"
            onPress={() => speakStory(activeStory)}
            accessibilityLabel="Read story aloud"
            accessibilityHint="Hear the selected story read out loud"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <AccessibleButton
            title="Read From Start"
            variant="secondary"
            size="large"
            onPress={() => {
              setActiveStoryId(activeStory.id);
              speakStory(activeStory);
            }}
            accessibilityLabel="Restart story from start"
            accessibilityHint="Hear the selected story from the beginning"
          />
        </View>
      </ScrollView>
    </View>
  );
}
