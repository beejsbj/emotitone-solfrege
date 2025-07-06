/**
 * UI Color Token System
 * Defines consistent color tokens for UI elements, separate from musical colors
 */

export const uiColorTokens = {
  background: {
    primary: "hsla(220, 13%, 9%, 1)",
    secondary: "hsla(220, 13%, 13%, 1)",
    elevated: "hsla(220, 13%, 18%, 1)",
    overlay: "hsla(220, 13%, 9%, 0.8)",
  },
  surface: {
    glass: "hsla(0, 0%, 100%, 0.1)",
    button: "hsla(280, 100%, 70%, 0.15)",
    accent: "hsla(280, 100%, 70%, 1)",
    card: "hsla(220, 13%, 15%, 0.9)",
    input: "hsla(220, 13%, 12%, 1)",
  },
  text: {
    primary: "hsla(220, 10%, 95%, 1)",
    secondary: "hsla(220, 10%, 70%, 1)",
    tertiary: "hsla(220, 10%, 50%, 1)",
    interactive: "hsla(280, 100%, 70%, 1)",
    muted: "hsla(220, 10%, 40%, 1)",
  },
  border: {
    default: "hsla(220, 13%, 25%, 1)",
    subtle: "hsla(220, 13%, 20%, 1)",
    accent: "hsla(280, 100%, 70%, 0.3)",
    focus: "hsla(280, 100%, 70%, 0.5)",
  },
  status: {
    success: "hsla(120, 100%, 50%, 1)",
    warning: "hsla(45, 100%, 50%, 1)",
    error: "hsla(0, 100%, 50%, 1)",
    info: "hsla(200, 100%, 60%, 1)",
  },
  shadow: {
    subtle: "hsla(220, 13%, 0%, 0.1)",
    medium: "hsla(220, 13%, 0%, 0.2)",
    strong: "hsla(220, 13%, 0%, 0.3)",
    colored: "hsla(280, 100%, 70%, 0.2)",
  },
} as const;

export type UIColorTokens = typeof uiColorTokens;