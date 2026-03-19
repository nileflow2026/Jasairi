/**
 * Accessible Button Component
 * Large touch targets with audio/haptic feedback
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Animated,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useTheme, useAccessibility } from '../theme/ThemeProvider';
import { useFeedback } from '../hooks/useFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AccessibleButton({
  children,
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon = null,
  iconPosition = 'left',
  style = {},
  textStyle = {},
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
  ...props
}) {
  const { theme } = useTheme();
  const { isReduceMotion } = useAccessibility();
  const { buttonFeedback } = useFeedback();
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // Button variants
  const variants = {
    primary: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
      textColor: theme.colors.accessibility.background,
      pressedBackgroundColor: theme.colors.primary[600],
      disabledBackgroundColor: theme.colors.gray[300],
      disabledTextColor: theme.colors.gray[500],
    },
    secondary: {
      backgroundColor: theme.colors.secondary[500],
      borderColor: theme.colors.secondary[500],
      textColor: theme.colors.accessibility.background,
      pressedBackgroundColor: theme.colors.secondary[600],
      disabledBackgroundColor: theme.colors.gray[300],
      disabledTextColor: theme.colors.gray[500],
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary[500],
      textColor: theme.colors.primary[500],
      pressedBackgroundColor: theme.colors.primary[50],
      disabledBackgroundColor: 'transparent',
      disabledTextColor: theme.colors.gray[400],
      disabledBorderColor: theme.colors.gray[300],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.colors.primary[500],
      pressedBackgroundColor: theme.colors.primary[50],
      disabledBackgroundColor: 'transparent',
      disabledTextColor: theme.colors.gray[400],
    },
    success: {
      backgroundColor: theme.colors.success[500],
      borderColor: theme.colors.success[500],
      textColor: theme.colors.accessibility.background,
      pressedBackgroundColor: theme.colors.success[600],
      disabledBackgroundColor: theme.colors.gray[300],
      disabledTextColor: theme.colors.gray[500],
    },
    error: {
      backgroundColor: theme.colors.error[500],
      borderColor: theme.colors.error[500],
      textColor: theme.colors.accessibility.background,
      pressedBackgroundColor: theme.colors.error[600],
      disabledBackgroundColor: theme.colors.gray[300],
      disabledTextColor: theme.colors.gray[500],
    },
  };

  // Button sizes with touch-friendly dimensions
  const sizes = {
    small: {
      minHeight: theme.touchTargets.minimum,
      minWidth: theme.touchTargets.minimum,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      fontSize: theme.typography.sizes.sm,
    },
    medium: {
      minHeight: theme.touchTargets.recommended,
      minWidth: theme.touchTargets.recommended,
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[3],
      fontSize: theme.typography.sizes.base,
    },
    large: {
      minHeight: theme.touchTargets.comfortable,
      minWidth: theme.touchTargets.comfortable,
      paddingHorizontal: theme.spacing[8],
      paddingVertical: theme.spacing[4],
      fontSize: theme.typography.sizes.lg,
    },
    extraLarge: {
      minHeight: theme.touchTargets.large,
      minWidth: theme.touchTargets.large,
      paddingHorizontal: theme.spacing[10],
      paddingVertical: theme.spacing[5],
      fontSize: theme.typography.sizes.xl,
    },
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.medium;

  // Animation handlers
  const animateIn = useCallback(() => {
    if (isReduceMotion) return;
    
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: theme.animations.fast,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, isReduceMotion, theme.animations.fast]);

  const animateOut = useCallback(() => {
    if (isReduceMotion) return;
    
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: theme.animations.fast,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, isReduceMotion, theme.animations.fast]);

  // Press handlers
  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    animateIn();
    
    // Provide immediate feedback
    buttonFeedback(accessibilityLabel || title);
  }, [disabled, loading, animateIn, buttonFeedback, accessibilityLabel, title]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    animateOut();
  }, [animateOut]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    
    onPress && onPress();
  }, [disabled, loading, onPress]);

  // Dynamic styles
  const getBackgroundColor = () => {
    if (disabled) return currentVariant.disabledBackgroundColor;
    if (isPressed) return currentVariant.pressedBackgroundColor;
    return currentVariant.backgroundColor;
  };

  const getBorderColor = () => {
    if (disabled && currentVariant.disabledBorderColor) {
      return currentVariant.disabledBorderColor;
    }
    return currentVariant.borderColor;
  };

  const getTextColor = () => {
    if (disabled) return currentVariant.disabledTextColor;
    return currentVariant.textColor;
  };

  // Animated style
  const animatedStyle = {
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.96],
        }),
      },
    ],
  };

  // Base button styles
  const buttonStyles = {
    ...currentSize,
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: currentVariant.borderColor === 'transparent' ? 0 : 2,
    borderRadius: theme.borderRadius.lg,
    flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.6 : 1,
    // Focus styles
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      ':focus': {
        boxShadow: `0 0 0 3px ${theme.colors.accessibility.focus}40`,
        borderColor: theme.colors.accessibility.focus,
      },
    }),
    ...style,
  };

  // Text styles
  const buttonTextStyles = {
    color: getTextColor(),
    fontSize: currentSize.fontSize,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
    ...textStyle,
  };

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityRole,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint: accessibilityHint || (disabled ? 'Button is disabled' : undefined),
    accessibilityState: {
      disabled: disabled || loading,
      busy: loading,
    },
    ...(testID && { testID }),
  };

  // Loading indicator
  const LoadingIndicator = () => (
    <View style={{ marginRight: theme.spacing[2] }}>
      <Text style={[buttonTextStyles, { opacity: 0.8 }]}>●●●</Text>
    </View>
  );

  // Icon component
  const IconComponent = () => {
    if (!icon) return null;
    
    const iconSpacing = iconPosition === 'right' 
      ? { marginLeft: theme.spacing[2] }
      : { marginRight: theme.spacing[2] };
    
    return (
      <View style={iconSpacing}>
        {icon}
      </View>
    );
  };

  return (
    <AnimatedPressable
      style={[buttonStyles, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      {...accessibilityProps}
      {...props}
    >
      {loading && <LoadingIndicator />}
      {!loading && <IconComponent />}
      
      {children ? (
        children
      ) : (
        <Text style={buttonTextStyles} numberOfLines={1}>
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

/**
 * Floating Action Button - Large circular button
 */
export function AccessibleFAB({
  onPress,
  icon,
  disabled = false,
  variant = 'primary',
  size = 'large',
  position = 'bottomRight',
  accessibilityLabel,
  accessibilityHint,
  style = {},
  ...props
}) {
  const { theme } = useTheme();
  
  // Position styles
  const positions = {
    bottomRight: {
      position: 'absolute',
      bottom: theme.spacing[6],
      right: theme.spacing[6],
    },
    bottomLeft: {
      position: 'absolute',
      bottom: theme.spacing[6],
      left: theme.spacing[6],
    },
    topRight: {
      position: 'absolute',
      top: theme.spacing[6],
      right: theme.spacing[6],
    },
    topLeft: {
      position: 'absolute',
      top: theme.spacing[6],
      left: theme.spacing[6],
    },
  };

  // FAB sizes
  const fabSizes = {
    medium: {
      width: theme.touchTargets.comfortable,
      height: theme.touchTargets.comfortable,
    },
    large: {
      width: theme.touchTargets.large,
      height: theme.touchTargets.large,
    },
    extraLarge: {
      width: theme.touchTargets.extraLarge,
      height: theme.touchTargets.extraLarge,
    },
  };

  const positionStyle = positions[position] || positions.bottomRight;
  const fabSize = fabSizes[size] || fabSizes.large;

  return (
    <AccessibleButton
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        positionStyle,
        fabSize,
        {
          borderRadius: theme.borderRadius.full,
          ...theme.shadows.lg,
        },
        style,
      ]}
      {...props}
    >
      {icon}
    </AccessibleButton>
  );
}

/**
 * Icon Button - Square button with icon only
 */
export function AccessibleIconButton({
  icon,
  onPress,
  disabled = false,
  variant = 'ghost',
  size = 'medium',
  accessibilityLabel,
  accessibilityHint,
  style = {},
  ...props
}) {
  const { theme } = useTheme();

  // Make icon buttons square
  const iconSizes = {
    small: {
      width: theme.touchTargets.minimum,
      height: theme.touchTargets.minimum,
    },
    medium: {
      width: theme.touchTargets.recommended,
      height: theme.touchTargets.recommended,
    },
    large: {
      width: theme.touchTargets.comfortable,
      height: theme.touchTargets.comfortable,
    },
  };

  const iconSize = iconSizes[size] || iconSizes.medium;

  return (
    <AccessibleButton
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      style={[
        iconSize,
        {
          padding: 0,
          borderRadius: theme.borderRadius.lg,
        },
        style,
      ]}
      {...props}
    >
      {icon}
    </AccessibleButton>
  );
}

export default AccessibleButton;