// app.config.js — dynamic config for EAS build-time env injection
// This replaces the static app.json for environment-specific values.
// The static app.json fields are spread in via the `config` argument.

export default ({ config }) => {
  const { plugins: _plugins, ...restConfig } = config;

  return {
    ...restConfig,
    plugins: [
      ...(config.plugins?.filter(
        (p) =>
          !(Array.isArray(p) && p[0] === "@sentry/react-native/expo") &&
          p !== "@sentry/react-native/expo",
      ) ?? []),
      [
        "@sentry/react-native/expo",
        {
          organization: "nile-flow-holidings",
          project: "jasiri",
          // Only upload source maps when SENTRY_AUTH_TOKEN is available (EAS secret)
          autoUpload: !!process.env.SENTRY_AUTH_TOKEN,
        },
      ],
    ],
    extra: {
      // Injected at EAS build time from eas.json env blocks or EAS secrets
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
      appwriteEndpoint:
        process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
        "https://cloud.appwrite.io/v1",
      appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "",
      eas: {
        projectId:
          process.env.EAS_PROJECT_ID ?? "184b5d00-df15-4c91-9f8d-8be048bddbc4",
      },
    },
    // Override android package for production safety
    android: {
      ...config.android,
      package: "com.jasiri",
    },
    ios: {
      ...config.ios,
      bundleIdentifier: "com.jasiri",
    },
    updates: {
      url:
        "https://u.expo.dev/" +
        (process.env.EAS_PROJECT_ID ?? "184b5d00-df15-4c91-9f8d-8be048bddbc4"),
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 10000,
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
  };
};
