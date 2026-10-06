import type { ExpoConfig } from "expo/config";

// Reversed iOS OAuth client ID, required by Google Sign-In on iOS.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace(".apps.googleusercontent.com", "")}`
  : "com.googleusercontent.apps.placeholder";

const config: ExpoConfig = {
  name: "BELKA'S",
  slug: "belkas",
  owner: "h3larry",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "belkas",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.belkas.enterprise",
    supportsTablet: false,
  },
  android: {
    package: "com.belkas.enterprise",
    adaptiveIcon: {
      backgroundColor: "#151413",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    ["expo-splash-screen", { backgroundColor: "#ffffff", image: "./assets/images/splash-icon.png", imageWidth: 96 }],
    "expo-secure-store",
    "expo-web-browser",
    ["@react-native-google-signin/google-signin", { iosUrlScheme }],
    // Ship only 64-bit ARM code: much smaller APK; covers virtually all Android phones in use.
    ["expo-build-properties", { android: { buildArchs: ["arm64-v8a"] } }],
  ],
  experiments: { typedRoutes: false, reactCompiler: true },
  extra: {
    eas: { projectId: "ea6933df-e202-4900-97e1-8ec83940e7cb" },
  },
};

export default config;
