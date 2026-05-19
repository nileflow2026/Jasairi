const { withNativeWind } = require("nativewind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig replaces getDefaultConfig and handles Sentry's
// debug ID injection in a way that is compatible with Expo's bundler.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
