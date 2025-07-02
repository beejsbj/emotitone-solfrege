/**
 * Sequencer Constants
 * Data definitions for multi-sequencer functionality
 */

import type { SequencerIcon, SequencerColorPalette } from "@/types/music";

/**
 * Predefined icons for sequencer visual distinction
 * Uses Lucide icon names
 */
export const SEQUENCER_ICONS: SequencerIcon[] = [
  "music",
  "piano",
  "guitar",
  "violin",
  "drums",
  "trumpet",
  "microphone",
  "headphones",
  "radio",
  "speaker",
  "heart",
  "star",
];

/**
 * Predefined color palettes for sequencer customization
 * Each palette includes primary, secondary, and accent colors
 */
export const SEQUENCER_COLOR_PALETTES: SequencerColorPalette[] = [
  {
    id: "blue",
    name: "Ocean",
    primary: "#3B82F6",
    secondary: "#1E40AF",
    accent: "#60A5FA",
  },
  {
    id: "green",
    name: "Forest",
    primary: "#10B981",
    secondary: "#047857",
    accent: "#34D399",
  },
  {
    id: "purple",
    name: "Cosmic",
    primary: "#8B5CF6",
    secondary: "#5B21B6",
    accent: "#A78BFA",
  },
  {
    id: "red",
    name: "Fire",
    primary: "#EF4444",
    secondary: "#B91C1C",
    accent: "#F87171",
  },
  {
    id: "yellow",
    name: "Sun",
    primary: "#F59E0B",
    secondary: "#D97706",
    accent: "#FBBF24",
  },
  {
    id: "pink",
    name: "Bloom",
    primary: "#EC4899",
    secondary: "#BE185D",
    accent: "#F472B6",
  },
];

/**
 * Get a color palette by ID
 */
export function getColorPaletteById(
  id: string
): SequencerColorPalette | undefined {
  return SEQUENCER_COLOR_PALETTES.find((palette) => palette.id === id);
}

/**
 * Get the default color palette
 */
export function getDefaultColorPalette(): SequencerColorPalette {
  return SEQUENCER_COLOR_PALETTES[0];
}
