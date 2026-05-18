/**
 * Dashboard Shell Component
 * Main navigation shell that manages child and parent dashboard views
 * Optimized for children with Down syndrome with separate parent interface
 */

import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ChildDashboard } from "./ChildDashboard";
import { ParentDashboard } from "./ParentDashboard";
import { useTheme } from "../theme/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  CHILD_NAME: "@jasiri_child_name",
  DASHBOARD_MODE: "@jasiri_dashboard_mode",
  CHILD_PROGRESS: "@jasiri_child_progress",
};

export function DashboardShell() {
  const { theme } = useTheme();
  const router = useRouter();
  const [currentView, setCurrentView] = useState("child"); // 'child' or 'parent'
  const [childData, setChildData] = useState({
    name: "Champion",
    progress: {},
  });

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedName = await AsyncStorage.getItem(STORAGE_KEYS.CHILD_NAME);
      const savedMode = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_MODE);
      const savedProgress = await AsyncStorage.getItem(
        STORAGE_KEYS.CHILD_PROGRESS,
      );

      if (savedName) {
        setChildData((prev) => ({
          ...prev,
          name: savedName,
        }));
      }

      if (savedMode) {
        setCurrentView(savedMode);
      }

      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setChildData((prev) => ({
          ...prev,
          progress,
        }));
      }
    } catch (error) {
      console.log("Error loading saved data:", error);
    }
  };

  const saveChildData = async (data) => {
    try {
      if (data.name) {
        await AsyncStorage.setItem(STORAGE_KEYS.CHILD_NAME, data.name);
      }
      if (data.progress) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.CHILD_PROGRESS,
          JSON.stringify(data.progress),
        );
      }
      setChildData((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.log("Error saving child data:", error);
    }
  };

  const handleNavigation = async (destination) => {
    try {
      const destinationPath =
        typeof destination === "string"
          ? destination
          : destination?.path || "child";

      await AsyncStorage.setItem(
        STORAGE_KEYS.DASHBOARD_MODE,
        destinationPath === "parent" ? "parent" : "child",
      );

      if (destinationPath === "parent" || destinationPath === "child") {
        setCurrentView(destinationPath);
      } else if (destinationPath === "games") {
        const gameId = typeof destination === "object" ? destination.game : undefined;
        router.push(gameId ? `/games?game=${gameId}` : "/games");
      } else if (destinationPath === "stories") {
        const storyId = typeof destination === "object" ? destination.story : undefined;
        router.push(storyId ? `/stories?story=${storyId}` : "/stories");
      } else if (destinationPath === "music") {
        const songId = typeof destination === "object" ? destination.song : undefined;
        router.push(songId ? `/music?song=${songId}` : "/music");
      } else {
        // Handle navigation to specific activities within child view
        console.log("Navigating to activity:", destinationPath);
        // Here you would navigate to specific activity screens
        // For now, we'll stay on child dashboard
      }
    } catch (error) {
      console.log("Error saving dashboard mode:", error);
      // Still navigate even if saving fails
      const destinationPath =
        typeof destination === "string"
          ? destination
          : destination?.path || "child";

      if (destinationPath === "parent" || destinationPath === "child") {
        setCurrentView(destinationPath);
      } else if (destinationPath === "games") {
        const gameId = typeof destination === "object" ? destination.game : undefined;
        router.push(gameId ? `/games?game=${gameId}` : "/games");
      } else if (destinationPath === "stories") {
        const storyId = typeof destination === "object" ? destination.story : undefined;
        router.push(storyId ? `/stories?story=${storyId}` : "/stories");
      } else if (destinationPath === "music") {
        const songId = typeof destination === "object" ? destination.song : undefined;
        router.push(songId ? `/music?song=${songId}` : "/music");
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.accessibility.background,
      }}
    >
      {currentView === "child" ? (
        <ChildDashboard
          onNavigate={handleNavigation}
          childName={childData.name}
        />
      ) : (
        <ParentDashboard
          onNavigate={handleNavigation}
          childData={childData}
          onUpdateChildData={saveChildData}
        />
      )}
    </View>
  );
}
