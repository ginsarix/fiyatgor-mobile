import { Platform, useColorScheme } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const palette = {
  light: {
    pageBg: "#f2f3f7",
    cardBg: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#d7dbe6",
    inputText: "#111111",
    inputPlaceholder: "gray",
    cardBorder: "#e0e3ec",
    bodyBorder: "#f0f0f0",
    textPrimary: "#222222",
    textSecondary: "#888888",
    btnBg: "#111111",
    btnBgOff: "#2b2b2b",
    btnText: "#ffffff",
    badgeFoundBg: "#e6f4ea",
    badgeNotFoundBg: "#fce8e6",
    badgeText: "#444444",
    discountBadgeBg: "#fdecea",
    discountBadgeBorder: "#f5c6c2",
    discountAccent: "#d64545",
    originalPriceText: "#9a9a9a",
    arrowIcon: "#555555",
    deleteIcon: "#9ca3af",
    modalSheetBg: "#f2f3f7",
    modalTitleBarBg: "#464C55",
    saveStateText: "#555555",
    catalogSheetBg: "#ffffff",
    catalogHandle: "rgba(0,0,0,0.15)",
    catalogHeaderBorder: "rgba(0,0,0,0.07)",
    catalogTitle: "#111111",
    catalogCloseIconBg: "rgba(0,0,0,0.08)",
    catalogCloseIconText: "#111111",
    catalogImageWrapperBg: "rgba(0,0,0,0.03)",
    catalogImageWrapperBorder: "rgba(0,0,0,0.08)",
    catalogCloseBtnBg: "#000000",
    catalogCloseBtnText: "#ffffff",
  },
  dark: {
    pageBg: "#121214",
    cardBg: "#1c1c1e",
    inputBg: "#1c1c1e",
    inputBorder: "#3a3a3c",
    inputText: "#eeeeee",
    inputPlaceholder: "#636366",
    cardBorder: "#3a3a3c",
    bodyBorder: "#2c2c2e",
    textPrimary: "#eeeeee",
    textSecondary: "#8e8e93",
    btnBg: "#1c1c1e",
    btnBgOff: "#2c2c2e",
    btnText: "#ffffff",
    badgeFoundBg: "#1a3a2a",
    badgeNotFoundBg: "#3a1a1a",
    badgeText: "#cccccc",
    discountBadgeBg: "#3a1a1a",
    discountBadgeBorder: "#5a2a2a",
    discountAccent: "#ff6b6b",
    originalPriceText: "#8e8e93",
    arrowIcon: "#8e8e93",
    deleteIcon: "#8e8e93",
    modalSheetBg: "#1c1c1e",
    modalTitleBarBg: "#2c2c2e",
    saveStateText: "#8e8e93",
    catalogSheetBg: "#0f0f0f",
    catalogHandle: "rgba(255,255,255,0.2)",
    catalogHeaderBorder: "rgba(255,255,255,0.07)",
    catalogTitle: "#ffffff",
    catalogCloseIconBg: "rgba(255,255,255,0.1)",
    catalogCloseIconText: "#ffffff",
    catalogImageWrapperBg: "rgba(255,255,255,0.04)",
    catalogImageWrapperBorder: "rgba(255,255,255,0.08)",
    catalogCloseBtnBg: "#ffffff",
    catalogCloseBtnText: "#000000",
  },
} as const;

export type ThemeColors = typeof palette.light;

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();

  // @ts-expect-error as const causing type overlap due to string literals, no problem in this context
  return scheme === "dark" ? palette.dark : palette.light;
}
