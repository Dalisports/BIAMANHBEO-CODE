// Lumina POS Light Theme - Material Design 3 Light
export const luminaLight = {
  name: "Lumina Light",
  type: "light",

  colors: {
    // Surface colors (light backgrounds)
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f3f4f5",
    "surface-container": "#edeeef",
    "surface-container-high": "#e7e8e9",
    "surface-container-highest": "#e1e3e4",
    "surface-dim": "#d9dadb",
    "surface": "#f8f9fa",
    "surface-bright": "#f8f9fa",
    "surface-tint": "#8c5000",

    // Primary colors
    "primary": "#8c5000",
    "primary-fixed": "#ffdcbf",
    "primary-fixed-dim": "#ffb874",
    "on-primary": "#ffffff",
    "on-primary-container": "#643700",
    "primary-container": "#ff9500",
    "inverse-primary": "#ffb874",
    "on-primary-fixed": "#2d1600",
    "on-primary-fixed-variant": "#6a3b00",

    // Secondary colors
    "secondary": "#5f5e5e",
    "secondary-fixed": "#e5e2e1",
    "secondary-fixed-dim": "#c8c6c5",
    "on-secondary": "#ffffff",
    "on-secondary-container": "#636262",
    "secondary-container": "#e2dfde",
    "on-secondary-fixed": "#1c1b1b",
    "on-secondary-fixed-variant": "#474746",

    // Tertiary colors
    "tertiary": "#005ac1",
    "tertiary-fixed": "#d8e2ff",
    "tertiary-fixed-dim": "#adc6ff",
    "on-tertiary": "#ffffff",
    "on-tertiary-container": "#003f8b",
    "tertiary-container": "#86aeff",
    "on-tertiary-fixed": "#001a41",
    "on-tertiary-fixed-variant": "#004494",

    // Error colors
    "error": "#ba1a1a",
    "error-container": "#ffdad6",
    "on-error": "#ffffff",
    "on-error-container": "#93000a",

    // Background & surface variants
    "background": "#f8f9fa",
    "on-background": "#191c1d",
    "surface-variant": "#e1e3e4",
    "on-surface": "#191c1d",
    "on-surface-variant": "#554334",
    "inverse-surface": "#2e3132",
    "inverse-on-surface": "#f0f1f2",

    // Outline
    "outline": "#887361",
    "outline-variant": "#dbc2ad",

    // Misc
    "shadow": "#000000",
    "scrim": "#000000",
  },

  fonts: {
    display: "'Epilogue', sans-serif",
    body: "'Work Sans', sans-serif",
    displayLg: "'Epilogue', sans-serif",
    headlineMd: "'Epilogue', sans-serif",
    bodyMd: "'Work Sans', sans-serif",
    labelUpper: "'Work Sans', sans-serif",
    priceDisplay: "'Epilogue', sans-serif",
    titleSm: "'Work Sans', sans-serif",
  },

  spacing: {
    "xs": "8px",
    "sm": "12px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "container-padding": "20px",
    "grid-gutter": "12px",
  },

  borderRadius: {
    "DEFAULT": "0.25rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "full": "9999px",
  },

  fontSize: {
    "display-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
    "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
    "body-md": ["16px", { lineHeight: "1.5", fontWeight: "500" }],
    "label-upper": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "700" }],
    "price-display": ["28px", { lineHeight: "1", letterSpacing: "-0.01em", fontWeight: "700" }],
    "title-sm": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
  }
};