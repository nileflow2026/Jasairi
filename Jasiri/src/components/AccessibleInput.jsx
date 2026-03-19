/**
 * Accessible Input Components
 * High contrast, large touch targets, clear feedback
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme, useAccessibility } from '../theme/ThemeProvider';
import { useFeedback } from '../hooks/useFeedback';

/**
 * Accessible Text Input with large touch target and clear feedback
 */
export function AccessibleTextInput({
  value,
  onChangeText,
  placeholder,
  label,
  helperText,
  errorText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  secureTextEntry = false,
  leftIcon = null,
  rightIcon = null,
  onFocus,
  onBlur,
  style = {},
  inputStyle = {},
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...props
}) {
  const { theme } = useTheme();
  const { isHighContrast, isLargeText } = useAccessibility();
  const { focusFeedback, errorFeedback } = useFeedback();
  
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  // Update error state
  useEffect(() => {
    const newHasError = Boolean(errorText);
    if (newHasError !== hasError) {
      setHasError(newHasError);
      if (newHasError && isFocused) {
        errorFeedback(errorText);
      }
    }
  }, [errorText, hasError, isFocused, errorFeedback]);

  // Animation for focus state
  const animateFocus = useCallback((focused) => {
    Animated.timing(animatedValue, {
      toValue: focused ? 1 : 0,
      duration: theme.animations.normal,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, theme.animations.normal]);

  // Focus handlers
  const handleFocus = useCallback((event) => {
    setIsFocused(true);
    animateFocus(true);
    focusFeedback(accessibilityLabel || label || placeholder);
    onFocus && onFocus(event);
  }, [animateFocus, focusFeedback, accessibilityLabel, label, placeholder, onFocus]);

  const handleBlur = useCallback((event) => {
    setIsFocused(false);
    animateFocus(false);
    onBlur && onBlur(event);
  }, [animateFocus, onBlur]);

  // Focus the input programmatically
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Get dynamic colors based on state
  const getBorderColor = () => {
    if (hasError) return theme.colors.error[500];
    if (isFocused) return theme.colors.primary[500];
    if (disabled) return theme.colors.gray[300];
    return theme.colors.gray[400];
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.gray[100];
    if (isHighContrast) return theme.colors.accessibility.background;
    return theme.colors.accessibility.surface;
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.gray[500];
    if (isHighContrast) return theme.colors.accessibility.highContrast;
    return theme.colors.gray[900];
  };

  // Dynamic styles
  const containerStyles = {
    marginBottom: theme.spacing[4],
    ...style,
  };

  const labelStyles = {
    fontSize: isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: hasError ? theme.colors.error[500] : theme.colors.gray[700],
    marginBottom: theme.spacing[2],
  };

  const inputContainerStyles = {
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: 2,
    borderRadius: theme.borderRadius.lg,
    minHeight: theme.touchTargets.recommended,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    // Focus shadow
    shadowColor: isFocused ? theme.colors.primary[500] : 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: isFocused ? 0.2 : 0,
    shadowRadius: 4,
    elevation: isFocused ? 2 : 0,
  };

  const textInputStyles = {
    flex: 1,
    fontSize: isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base,
    lineHeight: theme.typography.lineHeights.normal * (isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base),
    color: getTextColor(),
    textAlignVertical: multiline ? 'top' : 'center',
    minHeight: multiline ? theme.touchTargets.recommended * numberOfLines : undefined,
    maxHeight: multiline ? theme.touchTargets.recommended * 4 : undefined,
    ...inputStyle,
  };

  const helperTextStyles = {
    fontSize: theme.typography.sizes.sm,
    color: hasError ? theme.colors.error[500] : theme.colors.gray[600],
    marginTop: theme.spacing[1],
    marginLeft: theme.spacing[1],
  };

  const iconStyles = {
    marginHorizontal: theme.spacing[2],
    opacity: disabled ? 0.5 : 1,
  };

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel: accessibilityLabel || label || placeholder,
    accessibilityHint: accessibilityHint || helperText,
    accessibilityState: {
      disabled,
      invalid: hasError,
    },
    ...(testID && { testID }),
  };

  return (
    <View style={containerStyles}>
      {label && (
        <Text style={labelStyles} accessible={false}>
          {label}
          {maxLength && value && (
            <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.gray[500] }}>
              {` (${value.length}/${maxLength})`}
            </Text>
          )}
        </Text>
      )}
      
      <Pressable
        style={inputContainerStyles}
        onPress={focus}
        accessible={false}
      >
        {leftIcon && (
          <View style={iconStyles}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={inputRef}
          style={textInputStyles}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray[500]}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...accessibilityProps}
          {...props}
        />
        
        {rightIcon && (
          <View style={iconStyles}>
            {rightIcon}
          </View>
        )}
      </Pressable>
      
      {(helperText || errorText) && (
        <Text style={helperTextStyles} accessible={false}>
          {errorText || helperText}
        </Text>
      )}
    </View>
  );
}

/**
 * Accessible Checkbox with large touch target
 */
export function AccessibleCheckbox({
  checked = false,
  onToggle,
  label,
  disabled = false,
  size = 'medium',
  style = {},
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...props
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { buttonFeedback } = useFeedback();

  const sizes = {
    small: {
      width: theme.spacing[5],
      height: theme.spacing[5],
      touchTarget: theme.touchTargets.minimum,
    },
    medium: {
      width: theme.spacing[6],
      height: theme.spacing[6],
      touchTarget: theme.touchTargets.recommended,
    },
    large: {
      width: theme.spacing[8],
      height: theme.spacing[8],
      touchTarget: theme.touchTargets.comfortable,
    },
  };

  const currentSize = sizes[size] || sizes.medium;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    
    const newChecked = !checked;
    buttonFeedback(newChecked ? 'Checked' : 'Unchecked');
    onToggle && onToggle(newChecked);
  }, [disabled, checked, buttonFeedback, onToggle]);

  const containerStyles = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: currentSize.touchTarget,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const touchAreaStyles = {
    width: currentSize.touchTarget,
    height: currentSize.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  };

  const checkboxStyles = {
    width: currentSize.width,
    height: currentSize.height,
    borderWidth: 2,
    borderColor: checked ? theme.colors.primary[500] : theme.colors.gray[400],
    backgroundColor: checked ? theme.colors.primary[500] : theme.colors.accessibility.background,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const labelStyles = {
    flex: 1,
    fontSize: isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base,
    color: disabled ? theme.colors.gray[500] : theme.colors.gray[900],
    fontWeight: theme.typography.weights.normal,
  };

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'checkbox',
    accessibilityLabel: accessibilityLabel || label,
    accessibilityHint: accessibilityHint,
    accessibilityState: {
      checked,
      disabled,
    },
    ...(testID && { testID }),
  };

  return (
    <Pressable
      style={containerStyles}
      onPress={handleToggle}
      disabled={disabled}
      {...accessibilityProps}
      {...props}
    >
      <View style={touchAreaStyles}>
        <View style={checkboxStyles}>
          {checked && (
            <Text style={{ color: theme.colors.accessibility.background, fontSize: currentSize.width * 0.6 }}>
              ✓
            </Text>
          )}
        </View>
      </View>
      
      {label && (
        <Text style={labelStyles}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Accessible Radio Button with large touch target
 */
export function AccessibleRadioButton({
  selected = false,
  onSelect,
  label,
  value,
  disabled = false,
  size = 'medium',
  style = {},
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...props
}) {
  const { theme } = useTheme();
  const { isLargeText } = useAccessibility();
  const { buttonFeedback } = useFeedback();

  const sizes = {
    small: {
      width: theme.spacing[5],
      height: theme.spacing[5],
      touchTarget: theme.touchTargets.minimum,
    },
    medium: {
      width: theme.spacing[6],
      height: theme.spacing[6],
      touchTarget: theme.touchTargets.recommended,
    },
    large: {
      width: theme.spacing[8],
      height: theme.spacing[8],
      touchTarget: theme.touchTargets.comfortable,
    },
  };

  const currentSize = sizes[size] || sizes.medium;

  const handleSelect = useCallback(() => {
    if (disabled || selected) return;
    
    buttonFeedback(label || `Selected ${value}`);
    onSelect && onSelect(value);
  }, [disabled, selected, buttonFeedback, label, value, onSelect]);

  const containerStyles = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: currentSize.touchTarget,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const touchAreaStyles = {
    width: currentSize.touchTarget,
    height: currentSize.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  };

  const radioStyles = {
    width: currentSize.width,
    height: currentSize.height,
    borderWidth: 2,
    borderColor: selected ? theme.colors.primary[500] : theme.colors.gray[400],
    backgroundColor: theme.colors.accessibility.background,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const innerCircleStyles = {
    width: currentSize.width * 0.5,
    height: currentSize.height * 0.5,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
  };

  const labelStyles = {
    flex: 1,
    fontSize: isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base,
    color: disabled ? theme.colors.gray[500] : theme.colors.gray[900],
    fontWeight: theme.typography.weights.normal,
  };

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'radio',
    accessibilityLabel: accessibilityLabel || label,
    accessibilityHint: accessibilityHint,
    accessibilityState: {
      checked: selected,
      disabled,
    },
    ...(testID && { testID }),
  };

  return (
    <Pressable
      style={containerStyles}
      onPress={handleSelect}
      disabled={disabled}
      {...accessibilityProps}
      {...props}
    >
      <View style={touchAreaStyles}>
        <View style={radioStyles}>
          {selected && <View style={innerCircleStyles} />}
        </View>
      </View>
      
      {label && (
        <Text style={labelStyles}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Accessible Switch with large touch target
 */
export function AccessibleSwitch({
  value = false,
  onToggle,
  label,
  disabled = false,
  size = 'medium',
  style = {},
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...props
}) {
  const { theme } = useTheme();
  const { isLargeText, isReduceMotion } = useAccessibility();
  const { buttonFeedback } = useFeedback();
  
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const sizes = {
    small: {
      width: theme.spacing[12],
      height: theme.spacing[6],
      thumbSize: theme.spacing[5],
      touchTarget: theme.touchTargets.minimum,
    },
    medium: {
      width: theme.spacing[14],
      height: theme.spacing[7],
      thumbSize: theme.spacing[6],
      touchTarget: theme.touchTargets.recommended,
    },
    large: {
      width: theme.spacing[16],
      height: theme.spacing[8],
      thumbSize: theme.spacing[7],
      touchTarget: theme.touchTargets.comfortable,
    },
  };

  const currentSize = sizes[size] || sizes.medium;

  // Animate switch when value changes
  useEffect(() => {
    if (isReduceMotion) {
      animatedValue.setValue(value ? 1 : 0);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: theme.animations.fast,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue, isReduceMotion, theme.animations.fast]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    
    const newValue = !value;
    buttonFeedback(newValue ? 'Switch on' : 'Switch off');
    onToggle && onToggle(newValue);
  }, [disabled, value, buttonFeedback, onToggle]);

  const containerStyles = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: currentSize.touchTarget,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const touchAreaStyles = {
    width: Math.max(currentSize.width, currentSize.touchTarget),
    height: currentSize.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  };

  const trackStyles = {
    width: currentSize.width,
    height: currentSize.height,
    borderRadius: currentSize.height / 2,
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.gray[300], theme.colors.primary[500]],
    }),
    justifyContent: 'center',
  };

  const thumbStyles = {
    width: currentSize.thumbSize,
    height: currentSize.thumbSize,
    borderRadius: currentSize.thumbSize / 2,
    backgroundColor: theme.colors.accessibility.background,
    shadowColor: theme.colors.gray[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [2, currentSize.width - currentSize.thumbSize - 2],
        }),
      },
    ],
  };

  const labelStyles = {
    flex: 1,
    fontSize: isLargeText ? theme.typography.sizes.lg : theme.typography.sizes.base,
    color: disabled ? theme.colors.gray[500] : theme.colors.gray[900],
    fontWeight: theme.typography.weights.normal,
  };

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: accessibilityLabel || label,
    accessibilityHint: accessibilityHint,
    accessibilityState: {
      checked: value,
      disabled,
    },
    ...(testID && { testID }),
  };

  return (
    <Pressable
      style={containerStyles}
      onPress={handleToggle}
      disabled={disabled}
      {...accessibilityProps}
      {...props}
    >
      <View style={touchAreaStyles}>
        <Animated.View style={trackStyles}>
          <Animated.View style={thumbStyles} />
        </Animated.View>
      </View>
      
      {label && (
        <Text style={labelStyles}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default AccessibleTextInput;