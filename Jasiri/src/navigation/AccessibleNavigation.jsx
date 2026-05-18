/**
 * Accessible Navigation Components
 * Large touch targets, clear hierarchy, audio feedback
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useAccessibility } from "../theme/ThemeProvider";
import { useFeedback } from "../hooks/useFeedback";

/**
 * Accessible Tab Navigation
 */
export function AccessibleTabBar({
  tabs,
  activeTab,
  onTabChange,
  position = "bottom",
  style = {},
  tabStyle = {},
  labelStyle = {},
  indicatorStyle = {},
  accessible = true,
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { navigationFeedback } = useFeedback();
  const scrollViewRef = useRef(null);

  const handleTabPress = useCallback(
    (tab, index) => {
      if (tab.disabled || activeTab === tab.id) return;

      navigationFeedback(tab.label || tab.title);
      onTabChange && onTabChange(tab.id, index);
    },
    [activeTab, navigationFeedback, onTabChange],
  );

  const getTabStyle = (tab, index) => {
    const isActive = activeTab === tab.id;
    const isFirst = index === 0;
    const isLast = index === tabs.length - 1;

    return {
      flex: 1,
      minHeight: theme.touchTargets.comfortable,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isActive
        ? theme.colors.primary[50]
        : theme.colors.accessibility.surface,
      borderTopWidth: position === "bottom" && isActive ? 3 : 0,
      borderBottomWidth: position === "top" && isActive ? 3 : 0,
      borderTopColor: theme.colors.primary[500],
      borderBottomColor: theme.colors.primary[500],
      borderLeftWidth: 1,
      borderRightWidth: isLast ? 1 : 0,
      borderLeftColor: theme.colors.gray[200],
      borderRightColor: theme.colors.gray[200],
      opacity: tab.disabled ? 0.5 : 1,
      ...tabStyle,
    };
  };

  const getLabelStyle = (tab) => {
    const isActive = activeTab === tab.id;

    return {
      fontSize: isLargeText
        ? theme.typography.sizes.lg
        : theme.typography.sizes.base,
      fontWeight: isActive
        ? theme.typography.weights.semibold
        : theme.typography.weights.normal,
      color: isActive ? theme.colors.primary[700] : theme.colors.gray[600],
      textAlign: "center",
      ...labelStyle,
    };
  };

  const containerStyles = {
    flexDirection: "row",
    backgroundColor: theme.colors.accessibility.surface,
    borderTopWidth: position === "bottom" ? 1 : 0,
    borderBottomWidth: position === "top" ? 1 : 0,
    borderColor: theme.colors.gray[200],
    ...theme.shadows.sm,
    ...style,
  };

  return (
    <View style={containerStyles}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.id || index}
            style={getTabStyle(tab, index)}
            onPress={() => handleTabPress(tab, index)}
            disabled={tab.disabled}
            accessible={accessible}
            accessibilityRole="tab"
            accessibilityLabel={
              tab.accessibilityLabel || tab.label || tab.title
            }
            accessibilityHint={
              tab.accessibilityHint || `Tab ${index + 1} of ${tabs.length}`
            }
            accessibilityState={{
              selected: activeTab === tab.id,
              disabled: tab.disabled,
            }}
          >
            {tab.icon && (
              <View style={{ marginBottom: theme.spacing[1] }}>{tab.icon}</View>
            )}

            <Text style={getLabelStyle(tab)} numberOfLines={1}>
              {tab.label || tab.title}
            </Text>

            {tab.badge && (
              <View
                style={{
                  position: "absolute",
                  top: theme.spacing[1],
                  right: theme.spacing[1],
                  backgroundColor: theme.colors.error[500],
                  borderRadius: theme.borderRadius.full,
                  minWidth: theme.spacing[5],
                  height: theme.spacing[5],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.colors.accessibility.background,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: theme.typography.weights.bold,
                  }}
                >
                  {tab.badge}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Accessible Header/Navigation Bar
 */
export function AccessibleHeader({
  title,
  subtitle,
  leftAction,
  rightActions = [],
  backgroundColor,
  textColor,
  style = {},
  titleStyle = {},
  subtitleStyle = {},
  centerContent = false,
  showBackButton = false,
  onBackPress,
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { navigationFeedback } = useFeedback();

  const handleBackPress = useCallback(() => {
    navigationFeedback("Going back");
    onBackPress && onBackPress();
  }, [navigationFeedback, onBackPress]);

  const headerHeight = isLargeText ? theme.spacing[16] : theme.spacing[14];

  const containerStyles = {
    height: headerHeight,
    backgroundColor: backgroundColor || theme.colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight || 0,
    ...theme.shadows.sm,
    ...style,
  };

  const titleContainerStyles = {
    flex: 1,
    alignItems: centerContent ? "center" : "flex-start",
    justifyContent: "center",
    marginHorizontal: theme.spacing[4],
  };

  const titleTextStyles = {
    fontSize: isLargeText
      ? theme.typography.sizes["2xl"]
      : theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: textColor || theme.colors.accessibility.background,
    ...titleStyle,
  };

  const subtitleTextStyles = {
    fontSize: isLargeText
      ? theme.typography.sizes.base
      : theme.typography.sizes.sm,
    color: textColor || theme.colors.primary[100],
    marginTop: theme.spacing[1],
    ...subtitleStyle,
  };

  const actionButtonStyles = {
    minWidth: theme.touchTargets.recommended,
    minHeight: theme.touchTargets.recommended,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: theme.spacing[1],
  };

  return (
    <SafeAreaView
      style={{ backgroundColor: backgroundColor || theme.colors.primary[500] }}
    >
      <View style={containerStyles}>
        {/* Left Side */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {showBackButton && (
            <Pressable
              style={actionButtonStyles}
              onPress={handleBackPress}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Navigate to previous screen"
            >
              <Text
                style={{
                  color: textColor || theme.colors.accessibility.background,
                  fontSize: theme.typography.sizes.lg,
                }}
              >
                ←
              </Text>
            </Pressable>
          )}

          {leftAction && <View style={actionButtonStyles}>{leftAction}</View>}
        </View>

        {/* Title Area */}
        <View style={titleContainerStyles}>
          <Text
            style={titleTextStyles}
            numberOfLines={1}
            accessible={true}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={subtitleTextStyles}
              numberOfLines={1}
              accessible={true}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Actions */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {rightActions.map((action, index) => (
            <View key={index} style={actionButtonStyles}>
              {action}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Accessible Drawer Navigation Item
 */
export function AccessibleDrawerItem({
  label,
  icon,
  onPress,
  active = false,
  disabled = false,
  badge,
  style = {},
  labelStyle = {},
  iconStyle = {},
  accessibilityLabel,
  accessibilityHint,
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { buttonFeedback } = useFeedback();

  const handlePress = useCallback(() => {
    if (disabled) return;

    buttonFeedback(accessibilityLabel || label);
    onPress && onPress();
  }, [disabled, buttonFeedback, accessibilityLabel, label, onPress]);

  const containerStyles = {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.touchTargets.comfortable,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    backgroundColor: active ? theme.colors.primary[50] : "transparent",
    borderLeftWidth: active ? 4 : 0,
    borderLeftColor: theme.colors.primary[500],
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  const iconContainerStyles = {
    width: theme.spacing[8],
    alignItems: "center",
    marginRight: theme.spacing[4],
    ...iconStyle,
  };

  const labelTextStyles = {
    flex: 1,
    fontSize: isLargeText
      ? theme.typography.sizes.lg
      : theme.typography.sizes.base,
    fontWeight: active
      ? theme.typography.weights.semibold
      : theme.typography.weights.normal,
    color: active ? theme.colors.primary[700] : theme.colors.gray[700],
    ...labelStyle,
  };

  return (
    <Pressable
      style={containerStyles}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="menuitem"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        selected: active,
        disabled,
      }}
    >
      {icon && <View style={iconContainerStyles}>{icon}</View>}

      <Text style={labelTextStyles} numberOfLines={1}>
        {label}
      </Text>

      {badge && (
        <View
          style={{
            backgroundColor: theme.colors.error[500],
            borderRadius: theme.borderRadius.full,
            minWidth: theme.spacing[5],
            height: theme.spacing[5],
            alignItems: "center",
            justifyContent: "center",
            marginLeft: theme.spacing[2],
          }}
        >
          <Text
            style={{
              color: theme.colors.accessibility.background,
              fontSize: theme.typography.sizes.xs,
              fontWeight: theme.typography.weights.bold,
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Accessible Breadcrumb Navigation
 */
export function AccessibleBreadcrumb({
  items,
  onItemPress,
  separator = ">",
  maxItems = 4,
  style = {},
  itemStyle = {},
  separatorStyle = {},
  activeStyle = {},
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { navigationFeedback } = useFeedback();

  const handleItemPress = useCallback(
    (item, index) => {
      if (item.disabled) return;

      navigationFeedback(`Navigate to ${item.label}`);
      onItemPress && onItemPress(item, index);
    },
    [navigationFeedback, onItemPress],
  );

  // Truncate items if there are too many
  const displayItems =
    items.length > maxItems
      ? [
          items[0],
          { id: "ellipsis", label: "...", disabled: true },
          ...items.slice(-maxItems + 2),
        ]
      : items;

  const containerStyles = {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    flexWrap: "wrap",
    ...style,
  };

  const getItemStyle = (item, index, isLast) => ({
    minHeight: theme.touchTargets.minimum,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    alignItems: "center",
    justifyContent: "center",
    ...(isLast ? activeStyle : itemStyle),
  });

  const getTextStyle = (item, isLast) => ({
    fontSize: isLargeText
      ? theme.typography.sizes.base
      : theme.typography.sizes.sm,
    color: isLast
      ? theme.colors.gray[900]
      : item.disabled
        ? theme.colors.gray[400]
        : theme.colors.primary[600],
    fontWeight: isLast
      ? theme.typography.weights.semibold
      : theme.typography.weights.normal,
  });

  const separatorTextStyle = {
    fontSize: isLargeText
      ? theme.typography.sizes.base
      : theme.typography.sizes.sm,
    color: theme.colors.gray[400],
    marginHorizontal: theme.spacing[2],
    ...separatorStyle,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={containerStyles}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const showSeparator = !isLast;

        return (
          <View
            key={item.id || index}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Pressable
              style={getItemStyle(item, index, isLast)}
              onPress={() => handleItemPress(item, index)}
              disabled={item.disabled || isLast}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel || item.label}
              accessibilityHint={
                isLast ? "Current page" : `Navigate to ${item.label}`
              }
              accessibilityState={{
                disabled: item.disabled || isLast,
              }}
            >
              <Text style={getTextStyle(item, isLast)} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>

            {showSeparator && (
              <Text style={separatorTextStyle} accessible={false}>
                {separator}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/**
 * Accessible Bottom Sheet Navigation
 */
export function AccessibleBottomSheet({
  visible = false,
  onClose,
  children,
  title,
  snapPoints = ["50%", "90%"],
  initialSnapPoint = 0,
  style = {},
  handleStyle = {},
  contentStyle = {},
}) {
  const { theme } = useTheme();
  const { isReduceMotion } = useAccessibility();
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);
  const animatedValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

  // Animate sheet visibility
  React.useEffect(() => {
    if (isReduceMotion) {
      animatedValue.setValue(visible ? 1 : 0);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: theme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, [visible, animatedValue, isReduceMotion, theme.animations.normal]);

  const overlayStyles = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    opacity: animatedValue,
  };

  const sheetStyles = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.accessibility.background,
    borderTopLeftRadius: theme.borderRadius["3xl"],
    borderTopRightRadius: theme.borderRadius["3xl"],
    ...theme.shadows.lg,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [400, 0], // Adjust based on content height
        }),
      },
    ],
    ...style,
  };

  const handleStyles = {
    width: theme.spacing[12],
    height: theme.spacing[1],
    backgroundColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.full,
    alignSelf: "center",
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[4],
    ...handleStyle,
  };

  const titleStyles = {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gray[900],
    textAlign: "center",
    marginBottom: theme.spacing[4],
  };

  const contentStyles = {
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[6],
    ...contentStyle,
  };

  if (!visible) return null;

  return (
    <View style={{ ...StyleSheet.absoluteFillObject }}>
      <Animated.View style={overlayStyles}>
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close bottom sheet"
        />
      </Animated.View>

      <Animated.View style={sheetStyles}>
        <View style={handleStyles} />

        {title && (
          <Text
            style={titleStyles}
            accessible={true}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}

        <View style={contentStyles}>{children}</View>
      </Animated.View>
    </View>
  );
}
