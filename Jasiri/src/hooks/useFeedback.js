/**
 * Audio Feedback Hooks
 * Provides audio cues and voice feedback for accessibility
 */

import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAccessibility } from '../theme/ThemeProvider';

// Audio feedback types
export const AUDIO_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  BUTTON_PRESS: 'button_press',
  NAVIGATION: 'navigation',
  FOCUS: 'focus',
  ACHIEVEMENT: 'achievement',
  GENTLE_CHIME: 'gentle_chime',
  SOFT_CLICK: 'soft_click',
  SWOOSH: 'swoosh',
  POP: 'pop',
};

// Haptic feedback types
export const HAPTIC_TYPES = {
  LIGHT: Haptics.ImpactFeedbackStyle.Light,
  MEDIUM: Haptics.ImpactFeedbackStyle.Medium,
  HEAVY: Haptics.ImpactFeedbackStyle.Heavy,
  SUCCESS: Haptics.NotificationFeedbackType.Success,
  WARNING: Haptics.NotificationFeedbackType.Warning,
  ERROR: Haptics.NotificationFeedbackType.Error,
  SELECTION: Haptics.SelectionFeedbackType,
};

// Audio file mappings (placeholder - replace with actual audio files in production)
const AUDIO_FILES = {
  // Note: These files don't exist yet - audio system will gracefully handle missing files
  [AUDIO_TYPES.SUCCESS]: null, // require('../../assets/audio/success.wav'),
  [AUDIO_TYPES.ERROR]: null, // require('../../assets/audio/error.wav'),
  [AUDIO_TYPES.WARNING]: null, // require('../../assets/audio/warning.wav'),
  [AUDIO_TYPES.BUTTON_PRESS]: null, // require('../../assets/audio/button-press.wav'),
  [AUDIO_TYPES.NAVIGATION]: null, // require('../../assets/audio/navigation.wav'),
  [AUDIO_TYPES.FOCUS]: null, // require('../../assets/audio/focus.wav'),
  [AUDIO_TYPES.ACHIEVEMENT]: null, // require('../../assets/audio/achievement.wav'),
  [AUDIO_TYPES.GENTLE_CHIME]: null, // require('../../assets/audio/gentle-chime.wav'),
  [AUDIO_TYPES.SOFT_CLICK]: null, // require('../../assets/audio/soft-click.wav'),
  [AUDIO_TYPES.SWOOSH]: null, // require('../../assets/audio/swoosh.wav'),
  [AUDIO_TYPES.POP]: null, // require('../../assets/audio/pop.wav'),
};

/**
 * Hook for playing audio feedback sounds
 */
export function useAudioFeedback() {
  const { hasAudioFeedback } = useAccessibility();
  const soundsRef = useRef(new Map());

  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.warn('Failed to initialize audio:', error);
      }
    };

    initAudio();

    // Cleanup sounds on unmount
    return () => {
      soundsRef.current.forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.warn('Failed to unload sound:', error);
        }
      });
      soundsRef.current.clear();
    };
  }, []);

  // Load sound file
  const loadSound = useCallback(async (audioType) => {
    try {
      if (soundsRef.current.has(audioType)) {
        return soundsRef.current.get(audioType);
      }

      const audioFile = AUDIO_FILES[audioType];
      if (!audioFile) {
        // Gracefully handle missing audio files during development
        console.log(`Audio file placeholder for type: ${audioType} - add actual audio file for production`);
        return null;
      }

      const { sound } = await Audio.Sound.createAsync(audioFile, {
        shouldPlay: false,
        volume: 0.8,
        rate: 1.0,
        positionMillis: 0,
      });

      soundsRef.current.set(audioType, sound);
      return sound;
    } catch (error) {
      console.warn(`Failed to load sound ${audioType}:`, error);
      return null;
    }
  }, []);

  // Play audio feedback
  const playAudio = useCallback(async (audioType, options = {}) => {
    if (!hasAudioFeedback) return;

    try {
      const sound = await loadSound(audioType);
      if (!sound) return;

      // Set volume if specified
      if (options.volume !== undefined) {
        await sound.setVolumeAsync(options.volume);
      }

      // Set playback rate if specified
      if (options.rate !== undefined) {
        await sound.setRateAsync(options.rate, true);
      }

      // Play from beginning
      await sound.replayAsync();
    } catch (error) {
      console.warn(`Failed to play audio ${audioType}:`, error);
    }
  }, [hasAudioFeedback, loadSound]);

  // Quick play functions for common scenarios
  const playSuccess = useCallback((options) => playAudio(AUDIO_TYPES.SUCCESS, options), [playAudio]);
  const playError = useCallback((options) => playAudio(AUDIO_TYPES.ERROR, options), [playAudio]);
  const playWarning = useCallback((options) => playAudio(AUDIO_TYPES.WARNING, options), [playAudio]);
  const playButtonPress = useCallback((options) => playAudio(AUDIO_TYPES.BUTTON_PRESS, options), [playAudio]);
  const playNavigation = useCallback((options) => playAudio(AUDIO_TYPES.NAVIGATION, options), [playAudio]);
  const playFocus = useCallback((options) => playAudio(AUDIO_TYPES.FOCUS, options), [playAudio]);
  const playAchievement = useCallback((options) => playAudio(AUDIO_TYPES.ACHIEVEMENT, options), [playAudio]);

  return {
    playAudio,
    playSuccess,
    playError,
    playWarning,
    playButtonPress,
    playNavigation,
    playFocus,
    playAchievement,
    audioEnabled: hasAudioFeedback,
  };
}

/**
 * Hook for haptic feedback
 */
export function useHapticFeedback() {
  const { hasHapticFeedback } = useAccessibility();

  const triggerHaptic = useCallback(async (hapticType) => {
    if (!hasHapticFeedback) return;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    try {
      if (hapticType === HAPTIC_TYPES.SELECTION) {
        await Haptics.selectionAsync();
      } else if (Object.values(Haptics.ImpactFeedbackStyle).includes(hapticType)) {
        await Haptics.impactAsync(hapticType);
      } else if (Object.values(Haptics.NotificationFeedbackType).includes(hapticType)) {
        await Haptics.notificationAsync(hapticType);
      }
    } catch (error) {
      console.warn('Failed to trigger haptic feedback:', error);
    }
  }, [hasHapticFeedback]);

  // Quick haptic functions
  const hapticLight = useCallback(() => triggerHaptic(HAPTIC_TYPES.LIGHT), [triggerHaptic]);
  const hapticMedium = useCallback(() => triggerHaptic(HAPTIC_TYPES.MEDIUM), [triggerHaptic]);
  const hapticHeavy = useCallback(() => triggerHaptic(HAPTIC_TYPES.HEAVY), [triggerHaptic]);
  const hapticSuccess = useCallback(() => triggerHaptic(HAPTIC_TYPES.SUCCESS), [triggerHaptic]);
  const hapticWarning = useCallback(() => triggerHaptic(HAPTIC_TYPES.WARNING), [triggerHaptic]);
  const hapticError = useCallback(() => triggerHaptic(HAPTIC_TYPES.ERROR), [triggerHaptic]);
  const hapticSelection = useCallback(() => triggerHaptic(HAPTIC_TYPES.SELECTION), [triggerHaptic]);

  return {
    triggerHaptic,
    hapticLight,
    hapticMedium,
    hapticHeavy,
    hapticSuccess,
    hapticWarning,
    hapticError,
    hapticSelection,
    hapticEnabled: hasHapticFeedback,
  };
}

/**
 * Hook for text-to-speech functionality
 */
export function useSpeech() {
  const speakingRef = useRef(false);

  // Speak text with options
  const speak = useCallback(async (text, options = {}) => {
    if (!text || typeof text !== 'string') return;

    try {
      // Stop any current speech
      if (speakingRef.current) {
        await Speech.stop();
      }

      const speakOptions = {
        language: options.language || 'en-US',
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.8, // Slightly slower for better comprehension
        voice: options.voice,
        onStart: () => {
          speakingRef.current = true;
          options.onStart && options.onStart();
        },
        onDone: () => {
          speakingRef.current = false;
          options.onDone && options.onDone();
        },
        onStopped: () => {
          speakingRef.current = false;
          options.onStopped && options.onStopped();
        },
        onError: (error) => {
          speakingRef.current = false;
          console.warn('Speech error:', error);
          options.onError && options.onError(error);
        },
      };

      await Speech.speak(text, speakOptions);
    } catch (error) {
      speakingRef.current = false;
      console.warn('Failed to speak text:', error);
    }
  }, []);

  // Stop current speech
  const stopSpeaking = useCallback(async () => {
    try {
      if (speakingRef.current) {
        await Speech.stop();
        speakingRef.current = false;
      }
    } catch (error) {
      console.warn('Failed to stop speech:', error);
    }
  }, []);

  // Check if currently speaking
  const isSpeaking = useCallback(() => {
    return speakingRef.current;
  }, []);

  // Get available voices
  const getAvailableVoices = useCallback(async () => {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.warn('Failed to get available voices:', error);
      return [];
    }
  }, []);

  // Quick speak functions for common scenarios
  const speakError = useCallback((message) => {
    speak(`Error: ${message}`, { pitch: 0.9, rate: 0.7 });
  }, [speak]);

  const speakSuccess = useCallback((message) => {
    speak(`Success! ${message}`, { pitch: 1.1, rate: 0.8 });
  }, [speak]);

  const speakInstruction = useCallback((instruction) => {
    speak(instruction, { rate: 0.7 }); // Slower for instructions
  }, [speak]);

  const speakLabel = useCallback((label) => {
    speak(label, { rate: 0.8 });
  }, [speak]);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    getAvailableVoices,
    speakError,
    speakSuccess,
    speakInstruction,
    speakLabel,
  };
}

/**
 * Combined feedback hook for complete accessibility feedback
 */
export function useFeedback() {
  const audio = useAudioFeedback();
  const haptic = useHapticFeedback();
  const speech = useSpeech();

  // Provide combined feedback for common interactions
  const successFeedback = useCallback((message, audioOptions) => {
    audio.playSuccess(audioOptions);
    haptic.hapticSuccess();
    if (message) {
      speech.speakSuccess(message);
    }
  }, [audio, haptic, speech]);

  const errorFeedback = useCallback((message, audioOptions) => {
    audio.playError(audioOptions);
    haptic.hapticError();
    if (message) {
      speech.speakError(message);
    }
  }, [audio, haptic, speech]);

  const buttonFeedback = useCallback((label, audioOptions) => {
    audio.playButtonPress(audioOptions);
    haptic.hapticLight();
    if (label) {
      speech.speakLabel(label);
    }
  }, [audio, haptic, speech]);

  const navigationFeedback = useCallback((destination, audioOptions) => {
    audio.playNavigation(audioOptions);
    haptic.hapticMedium();
    if (destination) {
      speech.speak(`Navigating to ${destination}`);
    }
  }, [audio, haptic, speech]);

  const focusFeedback = useCallback((element, audioOptions) => {
    audio.playFocus(audioOptions);
    haptic.hapticLight();
    if (element) {
      speech.speakLabel(element);
    }
  }, [audio, haptic, speech]);

  return {
    // Individual hooks
    audio,
    haptic,
    speech,
    
    // Combined feedback functions
    successFeedback,
    errorFeedback,
    buttonFeedback,
    navigationFeedback,
    focusFeedback,
  };
}

export default useFeedback;