import { Platform } from "react-native";

export const C = {
  ink: "#151413",
  paper: "#ffffff",
  sand: "#f5f2ee",
  line: "#e7e3de",
  muted: "#6f6a64",
  accent: "#b4471f",
  accentDark: "#8f3517",
};

export const F = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
};

export const S = { gutter: 16 };
