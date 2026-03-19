/**
 * Dashboard Shell Component
 * Main navigation shell that manages child and parent dashboard views
 * Optimized for children with Down syndrome with separate parent interface
 */

import React, { useState, useEffect } from "react";
import { View } from "react-native";
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
      await AsyncStorage.setItem(
        STORAGE_KEYS.DASHBOARD_MODE,
        destination === "parent" ? "parent" : "child",
      );

      if (destination === "parent" || destination === "child") {
        setCurrentView(destination);
      } else {
        // Handle navigation to specific activities within child view
        console.log("Navigating to activity:", destination);
        // Here you would navigate to specific activity screens
        // For now, we'll stay on child dashboard
      }
    } catch (error) {
      console.log("Error saving dashboard mode:", error);
      // Still navigate even if saving fails
      if (destination === "parent" || destination === "child") {
        setCurrentView(destination);
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
