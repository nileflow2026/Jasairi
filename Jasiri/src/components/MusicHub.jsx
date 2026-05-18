/**
 * Music Hub
 * Simple song list with sing-along and audio cues
 */

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
import { useEffect, useState } from "react";

const SONG_LIBRARY = [
  {
    id: "hello-song",
    title: "Hello Song",
    emoji: "👋",
    summary: "A warm greeting song to start the day.",
    lyrics:
      "Hello, hello, it's time to start. Hello, hello, with a happy heart. Clap your hands and stomp your feet. Hello, friends, it's nice to meet.",
  },
  {
    id: "counting-beat",
    title: "Counting Beat",
    emoji: "🔢",
    summary: "A simple rhythm song for counting practice.",
    lyrics:
      "One, two, three, jump with me. Four, five, six, let's do tricks. Seven, eight, nine, feel the beat. Ten and smile, learning is sweet.",
  },
  {
    id: "calm-breath-song",
    title: "Calm Breath Song",
    emoji: "🌬️",
    summary: "A calming tune for slow breathing and rest.",
    lyrics:
      "Breathe in slow, breathe out light. Feel so calm, feel just right. Hands on heart, eyes can close. Soft and steady, in and out goes.",
  },
];

export function MusicHub() {
  const { theme } = useTheme();
  const { buttonFeedback } = useFeedback();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeSongId, setActiveSongId] = useState(SONG_LIBRARY[0].id);

  useEffect(() => {
    const requestedSong = Array.isArray(params.song)
      ? params.song[0]
      : params.song;
    if (
      requestedSong &&
      SONG_LIBRARY.some((song) => song.id === requestedSong)
    ) {
      setActiveSongId(requestedSong);
    }
  }, [params.song]);

  const activeSong =
    SONG_LIBRARY.find((song) => song.id === activeSongId) || SONG_LIBRARY[0];

  const playSong = (song) => {
    buttonFeedback(song.title);
    Speech.speak(`${song.title}. ${song.lyrics}`, {
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
        backgroundColor={theme.colors.warning[500]}
      />

      <View
        style={{
          backgroundColor: theme.colors.warning[500],
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
              Music & Songs
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.warning[100],
              }}
            >
              Songs to sing, move, and relax.
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
            textStyle={{ color: theme.colors.warning[800] }}
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
            backgroundColor: theme.colors.warning[50],
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[4],
            marginBottom: theme.spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.warning[800],
              marginBottom: theme.spacing[2],
            }}
          >
            Choose a song
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
            }}
          >
            Tap a song card, then press play to hear and sing along.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {SONG_LIBRARY.map((song) => {
            const selected = activeSongId === song.id;
            return (
              <Pressable
                key={song.id}
                onPress={() => {
                  setActiveSongId(song.id);
                  buttonFeedback(song.title);
                }}
                accessibilityRole="button"
                accessibilityLabel={song.title}
                accessibilityHint={song.summary}
                style={{
                  width: "100%",
                  minHeight: 120,
                  marginBottom: theme.spacing[3],
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: selected
                    ? theme.colors.warning[100]
                    : theme.colors.white,
                  borderWidth: 2,
                  borderColor: selected
                    ? theme.colors.warning[500]
                    : theme.colors.gray[200],
                  padding: theme.spacing[4],
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: selected ? theme.colors.warning[500] : "#000",
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
                  {song.emoji}
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
                    {song.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontSizes.base,
                      color: theme.colors.gray[600],
                      lineHeight: 24,
                    }}
                  >
                    {song.summary}
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
            {activeSong.title}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
              lineHeight: 26,
              marginBottom: theme.spacing[4],
            }}
          >
            {activeSong.lyrics}
          </Text>

          <AccessibleButton
            title="Play Song"
            variant="primary"
            size="large"
            onPress={() => playSong(activeSong)}
            accessibilityLabel="Play selected song"
            accessibilityHint="Hear the selected song lyrics"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <AccessibleButton
            title="Sing Again"
            variant="secondary"
            size="large"
            onPress={() => {
              setActiveSongId(activeSong.id);
              playSong(activeSong);
            }}
            accessibilityLabel="Repeat selected song"
            accessibilityHint="Hear the selected song one more time"
          />
        </View>
      </ScrollView>
    </View>
  );
}
