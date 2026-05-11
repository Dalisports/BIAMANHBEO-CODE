// Lumina POS Dark Theme - Material Design 3 Dark
export const luminaDark = {
  name: "Lumina Dark",
  type: "dark",
  
  colors: {
    // Surface colors (dark backgrounds)
    "surface-container-lowest": "#121212",
    "surface-container-low": "#1e1e1e",
    "surface-container": "#242424",
    "surface-container-high": "#2e2e2e",
    "surface-container-highest": "#383838",
    "surface-dim": "#121212",
    "surface": "#121212",
    "surface-bright": "#383838",
    "surface-tint": "#ffb874",
    
    // Primary colors (keep bright for visibility)
    "primary": "#ffb874",
    "primary-fixed": "#ffdcbf",
    "primary-fixed-dim": "#ffb874",
    "on-primary": "#2d1600",
    "on-primary-fixed": "#2d1600",
    "on-primary-fixed-variant": "#6a3b00",
    "primary-container": "#8c5000", // Darker version for contrast
    "on-primary-container": "#ffdcbf",
    "inverse-primary": "#8c5000",
    
    // Secondary colors
    "secondary": "#c8c6c5",
    "secondary-fixed": "#e5e2e1",
    "secondary-fixed-dim": "#c8c6c5",
    "on-secondary": "#1c1b1b",
    "on-secondary-fixed": "#1c1b1b",
    "on-secondary-fixed-variant": "#474746",
    "secondary-container": "#474746", // Darker
    "on-secondary-container": "#e5e2e1",
    
    // Tertiary colors
    "tertiary": "#adc6ff",
    "tertiary-fixed": "#d8e2ff",
    "tertiary-fixed-dim": "#adc6ff",
    "on-tertiary": "#001a41",
    "on-tertiary-fixed": "#001a41",
    "on-tertiary-fixed-variant": "#004494",
    "tertiary-container": "#004494", // Darker
    "on-tertiary-container": "#d8e2ff",
    
    // Error colors
    "error": "#ffb4ab",
    "error-container": "#93000a",
    "on-error": "#690005",
    "on-error-container": "#ffdad6",
    
    // Background & surface variants
    "background": "#121212",
    "on-background": "#e1e3e4",
    "surface-variant": "#444444",
    "on-surface": "#e1e3e4",
    "on-surface-variant": "#dbc2ad",
    "inverse-surface": "#e1e3e4",
    "inverse-on-surface": "#2e3132",
    
    // Outline
    "outline": "#887361",
    "outline-variant": "#887361",
    
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
