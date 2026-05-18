// app.config.js — dynamic config for EAS build-time env injection
// This replaces the static app.json for environment-specific values.
// The static app.json fields are spread in via the `config` argument.

export default ({ config }) => ({
  ...config,
  extra: {
    // Injected at EAS build time from eas.json env blocks or EAS secrets
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
    appwriteEndpoint:
      process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
      "https://cloud.appwrite.io/v1",
    appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "",
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
  // Override android package for production safety
  android: {
    ...config.android,
    package: "app.jasiri.learning",
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "app.jasiri.learning",
  },
  updates: {
    url: "https://u.expo.dev/" + (process.env.EAS_PROJECT_ID ?? ""),
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 10000,
  },
  runtimeVersion: {
    policy: "sdkVersion",
  },
});
