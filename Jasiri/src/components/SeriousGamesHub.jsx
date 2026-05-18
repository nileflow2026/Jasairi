/**
 * Serious Games Hub
 * Playable educational games with scoring and progress tracking
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { AccessibleButton } from "./AccessibleButton";
import { useFeedback } from "../hooks/useFeedback";
import { useTheme } from "../theme/ThemeProvider";
import useAuthStore from "../store/useAuthStore";
import useChildStore from "../store/useChildStore";
import { gameService } from "../services/gameService";

const GAME_STORAGE_KEY = "@jasiri_serious_games_progress";

const GAME_LIBRARY = [
  {
    id: "memory",
    title: "Memory",
    emoji: "🧠",
    subtitle: "Find the matching pairs.",
    accent: "primary",
    description: "Build attention and visual memory by flipping cards.",
  },
  {
    id: "matching",
    title: "Matching",
    emoji: "🖼️",
    subtitle: "Match the picture to the word.",
    accent: "success",
    description: "Practice word-picture recognition with simple choices.",
  },
  {
    id: "sequencing",
    title: "Sequencing",
    emoji: "🔢",
    subtitle: "Put the steps in order.",
    accent: "warning",
    description: "Learn daily routines by arranging steps correctly.",
  },
];

const MEMORY_CARDS = [
  { key: "apple", label: "Apple", emoji: "🍎" },
  { key: "ball", label: "Ball", emoji: "⚽" },
  { key: "cat", label: "Cat", emoji: "🐱" },
  { key: "dog", label: "Dog", emoji: "🐶" },
  { key: "sun", label: "Sun", emoji: "☀️" },
  { key: "star", label: "Star", emoji: "⭐" },
];

const MATCHING_ROUNDS = [
  {
    prompt: "Which word matches this picture?",
    picture: "🐶",
    answer: "Dog",
    options: ["Cat", "Dog", "Fish", "Bird"],
  },
  {
    prompt: "Which word matches this picture?",
    picture: "🍌",
    answer: "Banana",
    options: ["Apple", "Banana", "Pear", "Grape"],
  },
  {
    prompt: "Which word matches this picture?",
    picture: "🚗",
    answer: "Car",
    options: ["Bus", "Truck", "Car", "Bike"],
  },
  {
    prompt: "Which word matches this picture?",
    picture: "⭐",
    answer: "Star",
    options: ["Moon", "Star", "Cloud", "Sun"],
  },
];

const SEQUENCING_ROUNDS = [
  {
    title: "Morning Routine",
    steps: ["Wake up", "Brush teeth", "Get dressed", "Eat breakfast"],
  },
  {
    title: "Going to School",
    steps: ["Pack bag", "Put on shoes", "Say goodbye", "Ride to school"],
  },
];

function shuffleList(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[randomIndex];
    copy[randomIndex] = temp;
  }
  return copy;
}

function createDefaultProgress() {
  return {
    totalGamesPlayed: 0,
    totalCompleted: 0,
    totalScore: 0,
    bestScore: 0,
    games: {
      memory: { played: 0, completed: 0, bestScore: 0, lastScore: 0 },
      matching: { played: 0, completed: 0, bestScore: 0, lastScore: 0 },
      sequencing: { played: 0, completed: 0, bestScore: 0, lastScore: 0 },
    },
    recentResults: [],
  };
}

function getProgressForGame(progress, gameId) {
  return (
    progress.games[gameId] || {
      played: 0,
      completed: 0,
      bestScore: 0,
      lastScore: 0,
    }
  );
}

function buildProgressFromSessions(sessions, backendToLocalMap) {
  const nextProgress = createDefaultProgress();

  sessions.forEach((session) => {
    const localGameId = backendToLocalMap[session.gameId];
    if (!localGameId) return;

    const currentGameStats = getProgressForGame(nextProgress, localGameId);
    const isCompleted = session.status === "completed";
    const score = Number(session.finalScore) || 0;

    nextProgress.totalGamesPlayed += 1;
    currentGameStats.played += 1;

    if (isCompleted) {
      nextProgress.totalCompleted += 1;
      nextProgress.totalScore += score;
      nextProgress.bestScore = Math.max(nextProgress.bestScore, score);
      currentGameStats.completed += 1;
      currentGameStats.bestScore = Math.max(currentGameStats.bestScore, score);
      currentGameStats.lastScore = score;

      nextProgress.recentResults.push({
        gameId: localGameId,
        score,
        timestamp:
          Date.parse(session.completedAt || session.startedAt) || Date.now(),
      });
    }

    nextProgress.games[localGameId] = currentGameStats;
  });

  nextProgress.recentResults = nextProgress.recentResults
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return nextProgress;
}

// Compact stat chip used in each game's score panel
function StatPill({ label, value, accentColor }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: accentColor + "18",
        borderRadius: 14,
        paddingVertical: 10,
        marginHorizontal: 3,
        borderWidth: 1.5,
        borderColor: accentColor + "44",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Poppins-Bold",
          fontWeight: "800",
          color: accentColor,
          lineHeight: 26,
        }}
      >
        {String(value)}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Poppins-SemiBold",
          fontWeight: "600",
          color: "#667085",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MemoryGame({ theme, onComplete, onScoreChange, announce }) {
  const [cards, setCards] = useState(() =>
    shuffleList(
      MEMORY_CARDS.flatMap((item) => [
        { ...item, id: `${item.key}-a`, pairKey: item.key },
        { ...item, id: `${item.key}-b`, pairKey: item.key },
      ]),
    ),
  );
  const [revealedIds, setRevealedIds] = useState([]);
  const [matchedKeys, setMatchedKeys] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("Find the matching pairs.");
  const [completionReported, setCompletionReported] = useState(false);

  useEffect(() => {
    onScoreChange(score);
  }, [onScoreChange, score]);

  useEffect(() => {
    if (matchedKeys.length === MEMORY_CARDS.length && !completionReported) {
      setCompletionReported(true);
      const finalScore = score + 20;
      setScore(finalScore);
      setMessage("Great memory! You found every pair.");
      announce("Great memory! You found every pair.");
      onComplete(finalScore, {
        moves,
        matches: matchedKeys.length,
        accuracy: Math.round((matchedKeys.length / Math.max(moves, 1)) * 100),
      });
    }
  }, [
    announce,
    completionReported,
    matchedKeys.length,
    moves,
    onComplete,
    score,
  ]);

  const resetRound = () => {
    setCards(
      shuffleList(
        MEMORY_CARDS.flatMap((item) => [
          { ...item, id: `${item.key}-a`, pairKey: item.key },
          { ...item, id: `${item.key}-b`, pairKey: item.key },
        ]),
      ),
    );
    setRevealedIds([]);
    setMatchedKeys([]);
    setScore(0);
    setMoves(0);
    setLocked(false);
    setMessage("Find the matching pairs.");
    setCompletionReported(false);
  };

  const handleCardPress = (card) => {
    if (locked) return;
    if (revealedIds.includes(card.id) || matchedKeys.includes(card.pairKey)) {
      return;
    }

    announce(card.label);

    if (revealedIds.length === 0) {
      setRevealedIds([card.id]);
      return;
    }

    setLocked(true);
    setMoves((current) => current + 1);
    const firstCard = cards.find((item) => item.id === revealedIds[0]);
    const isMatch = firstCard && firstCard.pairKey === card.pairKey;

    const nextRevealedIds = [...revealedIds, card.id];
    setRevealedIds(nextRevealedIds);

    if (isMatch) {
      const nextMatched = [...matchedKeys, card.pairKey];
      setMatchedKeys(nextMatched);
      setScore((current) => current + 10);
      setMessage(`Nice! ${card.label} matched.`);
      announce(`Great job. ${card.label} matched.`);
      setLocked(false);
    } else {
      setScore((current) => Math.max(0, current - 1));
      setMessage("Try again. Those cards do not match.");
      announce("Try again.");
      setTimeout(() => {
        setRevealedIds([]);
        setLocked(false);
      }, 700);
    }
  };

  const progressPercent = Math.round(
    (matchedKeys.length / MEMORY_CARDS.length) * 100,
  );

  return (
    <View>
      <View
        style={{
          backgroundColor: theme.colors.primary[50],
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.primary[700],
            marginBottom: theme.spacing[1],
          }}
        >
          Memory Game
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.gray[700],
          }}
        >
          {message}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginBottom: theme.spacing[4],
        }}
      >
        <StatPill
          label="Score"
          value={score}
          accentColor={theme.colors.primary[600]}
        />
        <StatPill
          label="Moves"
          value={moves}
          accentColor={theme.colors.gray[500]}
        />
        <StatPill
          label="Done"
          value={`${progressPercent}%`}
          accentColor={theme.colors.success[600]}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {cards.map((card) => {
          const isOpen =
            revealedIds.includes(card.id) || matchedKeys.includes(card.pairKey);

          return (
            <Pressable
              key={card.id}
              onPress={() => handleCardPress(card)}
              accessibilityRole="button"
              accessibilityLabel={`${card.label} memory card`}
              accessibilityHint="Tap to reveal and match the card"
              style={{
                width: "47%",
                minHeight: 120,
                marginBottom: theme.spacing[3],
                borderRadius: theme.borderRadius.xl,
                backgroundColor: isOpen
                  ? theme.colors.success[100]
                  : theme.colors.white,
                borderWidth: 2,
                borderColor: isOpen
                  ? theme.colors.success[400]
                  : theme.colors.gray[200],
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: theme.fontSizes["4xl"],
                  marginBottom: theme.spacing[1],
                }}
              >
                {isOpen ? card.emoji : "❓"}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.lg,
                  fontWeight: theme.typography.weights.bold,
                  color: theme.colors.gray[800],
                }}
              >
                {isOpen ? card.label : "Tap me"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AccessibleButton
        title="Restart Memory Game"
        variant="secondary"
        size="large"
        onPress={resetRound}
        accessibilityLabel="Restart memory game"
        accessibilityHint="Start the memory game over with new shuffled cards"
        style={{ marginTop: theme.spacing[4] }}
      />
    </View>
  );
}

function MatchingGame({ theme, onComplete, onScoreChange, announce }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Choose the correct word.");
  const [completed, setCompleted] = useState(false);

  const round = MATCHING_ROUNDS[roundIndex];

  useEffect(() => {
    onScoreChange(score);
  }, [onScoreChange, score]);

  const finishGame = (finalScore) => {
    setCompleted(true);
    setMessage("Fantastic matching! You finished the game.");
    announce("Fantastic matching! You finished the game.");
    onComplete(finalScore, {
      rounds: MATCHING_ROUNDS.length,
      correct: MATCHING_ROUNDS.length,
      accuracy: 100,
    });
  };

  const handleAnswer = (option) => {
    if (completed) return;

    announce(option);

    if (option === round.answer) {
      const nextScore = score + 10;
      setScore(nextScore);
      setMessage(`Yes! ${round.answer} is correct.`);
      announce(`Correct. ${round.answer}.`);

      if (roundIndex === MATCHING_ROUNDS.length - 1) {
        setTimeout(() => finishGame(nextScore + 20), 500);
        return;
      }

      setTimeout(() => {
        setRoundIndex((current) => current + 1);
        setMessage("Choose the correct word.");
      }, 500);
    } else {
      setScore((current) => Math.max(0, current - 1));
      setMessage("Try again. Pick the word that matches the picture.");
      announce("Try again.");
    }
  };

  const restartGame = () => {
    setRoundIndex(0);
    setScore(0);
    setMessage("Choose the correct word.");
    setCompleted(false);
  };

  const progressPercent = Math.round(
    ((roundIndex + (completed ? 1 : 0)) / MATCHING_ROUNDS.length) * 100,
  );

  return (
    <View>
      <View
        style={{
          backgroundColor: theme.colors.success[50],
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.success[700],
            marginBottom: theme.spacing[1],
          }}
        >
          Matching Game
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.gray[700],
          }}
        >
          {message}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginBottom: theme.spacing[4],
        }}
      >
        <StatPill
          label="Score"
          value={score}
          accentColor={theme.colors.primary[600]}
        />
        <StatPill
          label="Round"
          value={`${Math.min(roundIndex + 1, MATCHING_ROUNDS.length)}/${MATCHING_ROUNDS.length}`}
          accentColor={theme.colors.gray[500]}
        />
        <StatPill
          label="Done"
          value={`${progressPercent}%`}
          accentColor={theme.colors.success[600]}
        />
      </View>

      <View
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[5],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.colors.gray[200],
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes["6xl"],
            marginBottom: theme.spacing[2],
          }}
        >
          {round.picture}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            textAlign: "center",
            color: theme.colors.gray[800],
          }}
        >
          {round.prompt}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {round.options.map((option) => (
          <Pressable
            key={option}
            onPress={() => handleAnswer(option)}
            accessibilityRole="button"
            accessibilityLabel={option}
            accessibilityHint="Tap to answer the question"
            style={{
              width: "47%",
              minHeight: 88,
              marginBottom: theme.spacing[3],
              borderRadius: theme.borderRadius.xl,
              backgroundColor: theme.colors.primary[50],
              borderWidth: 2,
              borderColor: theme.colors.primary[200],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSizes.xl,
                fontWeight: theme.typography.weights.bold,
                color: theme.colors.primary[800],
              }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <AccessibleButton
        title="Restart Matching Game"
        variant="secondary"
        size="large"
        onPress={restartGame}
        accessibilityLabel="Restart matching game"
        accessibilityHint="Start the matching game over"
        style={{ marginTop: theme.spacing[4] }}
      />
    </View>
  );
}

function SequencingGame({ theme, onComplete, onScoreChange, announce }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [availableSteps, setAvailableSteps] = useState(() =>
    shuffleList(SEQUENCING_ROUNDS[0].steps),
  );
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Tap the steps in the right order.");
  const [completed, setCompleted] = useState(false);

  const round = SEQUENCING_ROUNDS[roundIndex];

  useEffect(() => {
    onScoreChange(score);
  }, [onScoreChange, score]);

  const loadRound = (nextRoundIndex) => {
    const nextRound = SEQUENCING_ROUNDS[nextRoundIndex];
    setRoundIndex(nextRoundIndex);
    setAvailableSteps(shuffleList(nextRound.steps));
    setSelectedSteps([]);
    setMessage("Tap the steps in the right order.");
  };

  const finishGame = (finalScore) => {
    setCompleted(true);
    setMessage("Excellent sequencing! You finished all routines.");
    announce("Excellent sequencing! You finished all routines.");
    onComplete(finalScore, {
      rounds: SEQUENCING_ROUNDS.length,
      completedRounds: SEQUENCING_ROUNDS.length,
      accuracy: 100,
    });
  };

  const handleStepPress = (step) => {
    if (completed) return;

    const expectedStep = round.steps[selectedSteps.length];
    announce(step);

    if (step === expectedStep) {
      const nextSelected = [...selectedSteps, step];
      const stepScore = score + 5;
      setSelectedSteps(nextSelected);
      setAvailableSteps((current) => current.filter((item) => item !== step));
      setScore(stepScore);
      setMessage(`Yes! ${step} is in the right order.`);
      announce(`Correct. ${step}.`);

      if (nextSelected.length === round.steps.length) {
        const completedScore = stepScore + 15;
        setScore(completedScore);
        if (roundIndex === SEQUENCING_ROUNDS.length - 1) {
          setTimeout(() => finishGame(completedScore + 20), 500);
          return;
        }

        setTimeout(() => loadRound(roundIndex + 1), 900);
      }
    } else {
      setScore((current) => Math.max(0, current - 1));
      setMessage(`Try again. Start with ${expectedStep}.`);
      announce(`Try again. Start with ${expectedStep}.`);
    }
  };

  const restartGame = () => {
    setRoundIndex(0);
    setAvailableSteps(shuffleList(SEQUENCING_ROUNDS[0].steps));
    setSelectedSteps([]);
    setScore(0);
    setMessage("Tap the steps in the right order.");
    setCompleted(false);
  };

  const progressPercent = Math.round(
    ((roundIndex + (completed ? 1 : 0)) / SEQUENCING_ROUNDS.length) * 100,
  );

  return (
    <View>
      <View
        style={{
          backgroundColor: theme.colors.warning[50],
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.warning[800],
            marginBottom: theme.spacing[1],
          }}
        >
          Sequencing Game
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.gray[700],
          }}
        >
          {message}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginBottom: theme.spacing[4],
        }}
      >
        <StatPill
          label="Score"
          value={score}
          accentColor={theme.colors.primary[600]}
        />
        <StatPill
          label="Routine"
          value={`${Math.min(roundIndex + 1, SEQUENCING_ROUNDS.length)}/${SEQUENCING_ROUNDS.length}`}
          accentColor={theme.colors.gray[500]}
        />
        <StatPill
          label="Done"
          value={`${progressPercent}%`}
          accentColor={theme.colors.success[600]}
        />
      </View>

      <View
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
          borderWidth: 1,
          borderColor: theme.colors.gray[200],
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
          {round.title}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.gray[600],
          }}
        >
          Tap the steps in order.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.success[50],
          padding: theme.spacing[4],
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing[4],
          borderWidth: 1,
          borderColor: theme.colors.success[200],
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSizes.base,
            color: theme.colors.gray[700],
            marginBottom: theme.spacing[2],
          }}
        >
          Selected order:
        </Text>
        <Text
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.success[700],
          }}
        >
          {selectedSteps.length > 0
            ? selectedSteps.join("  →  ")
            : "Nothing selected yet"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {availableSteps.map((step) => (
          <Pressable
            key={step}
            onPress={() => handleStepPress(step)}
            accessibilityRole="button"
            accessibilityLabel={step}
            accessibilityHint="Tap to place the step in the sequence"
            style={{
              width: "47%",
              minHeight: 88,
              marginBottom: theme.spacing[3],
              borderRadius: theme.borderRadius.xl,
              backgroundColor: theme.colors.warning[100],
              borderWidth: 2,
              borderColor: theme.colors.warning[300],
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: theme.spacing[2],
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                fontWeight: theme.typography.weights.bold,
                color: theme.colors.warning[800],
                textAlign: "center",
              }}
            >
              {step}
            </Text>
          </Pressable>
        ))}
      </View>

      <AccessibleButton
        title="Restart Sequencing Game"
        variant="secondary"
        size="large"
        onPress={restartGame}
        accessibilityLabel="Restart sequencing game"
        accessibilityHint="Start the sequencing game over"
        style={{ marginTop: theme.spacing[4] }}
      />
    </View>
  );
}

export function SeriousGamesHub() {
  const { theme } = useTheme();
  const { successFeedback, buttonFeedback } = useFeedback();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeGame, setActiveGame] = useState("memory");
  const [progress, setProgress] = useState(createDefaultProgress());
  const [currentScore, setCurrentScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Choose a game to begin.");
  const [isLoaded, setIsLoaded] = useState(false);

  // Backend session tracking — best-effort, never blocks gameplay
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedChild = useChildStore((s) => s.selectedChild);
  const [backendGameIds, setBackendGameIds] = useState({}); // { memory: "<appwrite-id>", ... }
  const activeSessionRef = useRef({
    gameId: null,
    sessionId: null,
    startedAt: null,
  });
  const progressStorageKey = selectedChild?.$id
    ? `${GAME_STORAGE_KEY}_${selectedChild.$id}`
    : GAME_STORAGE_KEY;

  const loadProgress = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(progressStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProgress({
          ...createDefaultProgress(),
          ...parsed,
          games: { ...createDefaultProgress().games, ...(parsed.games || {}) },
        });
      }
    } catch (error) {
      console.log("Failed to load games progress:", error);
    }
  }, [progressStorageKey]);

  const persistProgress = useCallback(
    async (nextProgress) => {
      try {
        await AsyncStorage.setItem(
          progressStorageKey,
          JSON.stringify(nextProgress),
        );
      } catch (error) {
        console.log("Failed to save games progress:", error);
      }
    },
    [progressStorageKey],
  );

  // Fetch game catalogue and build local→backend ID map
  useEffect(() => {
    if (!isAuthenticated) return;
    gameService
      .list()
      .then((games) => {
        if (!Array.isArray(games)) return;
        const map = {};
        games.forEach((g) => {
          // Match by name (case-insensitive prefix)
          const name = (g.name || "").toLowerCase();
          if (name.startsWith("mem")) map.memory = g.$id;
          else if (name.startsWith("match")) map.matching = g.$id;
          else if (name.startsWith("seq")) map.sequencing = g.$id;
        });
        setBackendGameIds(map);
      })
      .catch(() => {
        // Backend unavailable — continue with local-only progress
      });
  }, [isAuthenticated]);

  // Abandon session on unmount if one is still active
  useEffect(() => {
    return () => {
      const { gameId, sessionId } = activeSessionRef.current;
      if (gameId && sessionId) {
        gameService.abandonSession(gameId, sessionId).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // If authenticated, replace local summary with backend-derived child progress.
  useEffect(() => {
    const selectedChildId = selectedChild?.$id;
    if (!isAuthenticated || !selectedChildId) return;
    if (Object.keys(backendGameIds).length === 0) return;

    const backendToLocalMap = Object.entries(backendGameIds).reduce(
      (acc, [localId, backendId]) => {
        if (backendId) acc[backendId] = localId;
        return acc;
      },
      {},
    );

    gameService
      .listSessions({ childId: selectedChildId })
      .then((sessions) => {
        if (!Array.isArray(sessions)) return;
        const backendProgress = buildProgressFromSessions(
          sessions,
          backendToLocalMap,
        );
        setProgress(backendProgress);
        persistProgress(backendProgress);
      })
      .catch(() => {
        // Fallback remains local cache
      });
  }, [backendGameIds, isAuthenticated, persistProgress, selectedChild?.$id]);

  useEffect(() => {
    if (!isLoaded) {
      const requestedGame = Array.isArray(params.game)
        ? params.game[0]
        : params.game;
      if (
        requestedGame &&
        GAME_LIBRARY.some((game) => game.id === requestedGame)
      ) {
        setActiveGame(requestedGame);
      }
      setStatusMessage("Choose a game to begin.");
      Speech.speak(
        "Welcome to the serious games hub. Choose Memory, Matching, or Sequencing to begin.",
        {
          language: "en",
          pitch: 1,
          rate: 0.9,
        },
      );
      setIsLoaded(true);
    }
  }, [isLoaded, params.game]);

  const updateGameProgress = (gameId, score, completionDetails = {}) => {
    setProgress((current) => {
      const currentGameStats = getProgressForGame(current, gameId);
      const nextGameStats = {
        ...currentGameStats,
        played: currentGameStats.played + 1,
        completed: currentGameStats.completed + 1,
        bestScore: Math.max(currentGameStats.bestScore, score),
        lastScore: score,
      };

      const nextProgress = {
        ...current,
        totalGamesPlayed: current.totalGamesPlayed + 1,
        totalCompleted: current.totalCompleted + 1,
        totalScore: current.totalScore + score,
        bestScore: Math.max(current.bestScore, score),
        games: {
          ...current.games,
          [gameId]: nextGameStats,
        },
        recentResults: [
          {
            gameId,
            score,
            timestamp: Date.now(),
            ...completionDetails,
          },
          ...current.recentResults,
        ].slice(0, 5),
      };

      persistProgress(nextProgress);
      return nextProgress;
    });

    setCurrentScore(score);
    setStatusMessage(`You finished ${gameId} with ${score} points.`);
    successFeedback(`You scored ${score} points in ${gameId}.`);
  };

  const announce = (message) => {
    buttonFeedback(message);
  };

  const handleGameSelect = (gameId) => {
    // Abandon previous session if switching games mid-play
    const prev = activeSessionRef.current;
    if (prev.sessionId && prev.gameId !== gameId) {
      gameService.abandonSession(prev.gameId, prev.sessionId).catch(() => {});
      activeSessionRef.current = {
        gameId: null,
        sessionId: null,
        startedAt: null,
      };
    }

    setActiveGame(gameId);
    setCurrentScore(0);
    const gameLabel =
      GAME_LIBRARY.find((item) => item.id === gameId)?.title || gameId;
    setStatusMessage(`${gameLabel} selected.`);
    announce(gameLabel);

    // Start backend session (fire-and-forget)
    if (isAuthenticated && selectedChild) {
      const backendId = backendGameIds[gameId];
      if (backendId) {
        gameService
          .startSession(backendId, selectedChild.$id, "beginner")
          .then((session) => {
            if (session?.$id) {
              activeSessionRef.current = {
                gameId: backendId,
                sessionId: session.$id,
                startedAt: Date.now(),
              };
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleGameComplete = (gameId, score, details) => {
    updateGameProgress(gameId, score, details);

    // Complete backend session (fire-and-forget)
    const {
      gameId: backendGameId,
      sessionId,
      startedAt,
    } = activeSessionRef.current;
    if (isAuthenticated && backendGameId && sessionId) {
      const completionTimeMs = startedAt ? Date.now() - startedAt : undefined;
      gameService
        .completeSession(backendGameId, sessionId, {
          finalScore: score,
          completionTimeMs,
          accuracy: details?.accuracy ?? null,
          rounds: details?.rounds ?? null,
        })
        .catch(() => {});
      activeSessionRef.current = {
        gameId: null,
        sessionId: null,
        startedAt: null,
      };
    }
  };

  const activeProgress = getProgressForGame(progress, activeGame);

  const renderActiveGame = () => {
    if (activeGame === "memory") {
      return (
        <MemoryGame
          key="memory-game"
          theme={theme}
          announce={announce}
          onScoreChange={setCurrentScore}
          onComplete={(score, details) =>
            handleGameComplete("memory", score, details)
          }
        />
      );
    }

    if (activeGame === "matching") {
      return (
        <MatchingGame
          key="matching-game"
          theme={theme}
          announce={announce}
          onScoreChange={setCurrentScore}
          onComplete={(score, details) =>
            handleGameComplete("matching", score, details)
          }
        />
      );
    }

    return (
      <SequencingGame
        key="sequencing-game"
        theme={theme}
        announce={announce}
        onScoreChange={setCurrentScore}
        onComplete={(score, details) =>
          handleGameComplete("sequencing", score, details)
        }
      />
    );
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

      <View
        style={{
          backgroundColor: theme.colors.primary[500],
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
              Serious Games
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.primary[100],
              }}
            >
              Play. Learn. Repeat.
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
            textStyle={{ color: theme.colors.primary[700] }}
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
            backgroundColor: theme.colors.gray[50],
            padding: theme.spacing[4],
            borderRadius: theme.borderRadius.xl,
            marginBottom: theme.spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.gray[800],
              marginBottom: theme.spacing[1],
            }}
          >
            Session Summary
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
              marginBottom: theme.spacing[2],
            }}
          >
            {statusMessage}
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[700],
              }}
            >
              Current score: {currentScore}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[700],
              }}
            >
              Best score: {progress.bestScore}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginBottom: theme.spacing[2],
          }}
        >
          {GAME_LIBRARY.map((game) => {
            const selected = activeGame === game.id;
            const palette = theme.colors[game.accent] || theme.colors.primary;

            return (
              <Pressable
                key={game.id}
                onPress={() => handleGameSelect(game.id)}
                accessibilityRole="button"
                accessibilityLabel={`${game.title} game`}
                accessibilityHint={game.description}
                style={{
                  width: "31%",
                  minHeight: 150,
                  marginBottom: theme.spacing[3],
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: selected ? palette[100] : theme.colors.white,
                  borderWidth: 2,
                  borderColor: selected ? palette[500] : theme.colors.gray[200],
                  padding: theme.spacing[3],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: theme.fontSizes["5xl"],
                    marginBottom: theme.spacing[2],
                  }}
                >
                  {game.emoji}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSizes.base,
                    fontWeight: theme.typography.weights.bold,
                    color: theme.colors.gray[800],
                    textAlign: "center",
                  }}
                >
                  {game.title}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSizes.xs,
                    color: theme.colors.gray[600],
                    textAlign: "center",
                    marginTop: theme.spacing[1],
                  }}
                >
                  {game.subtitle}
                </Text>
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
            marginBottom: theme.spacing[4],
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
            Progress Tracker
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: theme.spacing[2],
            }}
          >
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[700],
              }}
            >
              Played: {progress.totalGamesPlayed}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[700],
              }}
            >
              Completed: {progress.totalCompleted}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.gray[700],
              }}
            >
              Total score: {progress.totalScore}
            </Text>
          </View>
          <View
            style={{
              height: 12,
              borderRadius: 999,
              backgroundColor: theme.colors.gray[200],
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 12,
                width: `${Math.min((progress.totalCompleted / 9) * 100, 100)}%`,
                backgroundColor: theme.colors.success[500],
              }}
            />
          </View>
          <Text
            style={{
              fontSize: theme.fontSizes.sm,
              color: theme.colors.gray[600],
              marginTop: theme.spacing[2],
            }}
          >
            {progress.totalCompleted >= 9
              ? "Great progress! You completed the full starter path."
              : "Complete 9 rounds across the games to finish the starter path."}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[4],
            borderWidth: 1,
            borderColor: theme.colors.gray[200],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: theme.spacing[3],
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: theme.fontSizes.xl,
                  fontWeight: theme.typography.weights.bold,
                  color: theme.colors.gray[800],
                }}
              >
                {GAME_LIBRARY.find((item) => item.id === activeGame)?.title}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.base,
                  color: theme.colors.gray[600],
                }}
              >
                Best score: {activeProgress.bestScore} | Played:{" "}
                {activeProgress.played}
              </Text>
            </View>
            <AccessibleButton
              title="Hear instructions"
              variant="secondary"
              size="medium"
              onPress={() => {
                Speech.speak(
                  `You are on the ${GAME_LIBRARY.find((item) => item.id === activeGame)?.title} game. ${GAME_LIBRARY.find((item) => item.id === activeGame)?.description}`,
                  {
                    language: "en",
                    pitch: 1,
                    rate: 0.9,
                  },
                );
              }}
              accessibilityLabel="Hear game instructions"
              accessibilityHint="Play the audio instructions for the selected game"
            />
          </View>

          {renderActiveGame()}
        </View>

        <View
          style={{
            backgroundColor: theme.colors.primary[50],
            padding: theme.spacing[4],
            borderRadius: theme.borderRadius.xl,
            marginTop: theme.spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.primary[700],
              marginBottom: theme.spacing[2],
            }}
          >
            Why these games work
          </Text>
          <Text
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.gray[700],
              lineHeight: 26,
            }}
          >
            Memory supports attention and recall. Matching strengthens
            word-picture recognition. Sequencing builds routine understanding
            and planning.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
