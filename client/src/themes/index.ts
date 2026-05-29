import { luminaLight } from "./lumina-light";
import { luminaDark } from "./lumina-dark";

export { luminaLight, luminaDark };

export type ThemeConfig = {
  name: string;
  type: "light" | "dark";
  colors: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  fontSize?: Record<string, any>;
};

export const themes = {
  luminaLight,
  luminaDark,
} as Record<string, ThemeConfig>;

export const themeNames = {
  luminaLight: "Lumina Light",
  luminaDark: "Lumina Dark",
};
