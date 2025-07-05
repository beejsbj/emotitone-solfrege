/**
 * Simple, direct color utilities for musical notes
 * Replaces the over-engineered 598-line color system with straightforward functions
 */

import { CHROMATIC_NOTES, SOLFEGE_NOTES } from "@/data";

/**
 * Get note index for chromatic (0-11) or solfege (0-6) mapping
 */
function getNoteIndex(noteName: string, chromatic = false): number {
  const cleanName = noteName.replace("'", ""); // Remove octave indicator
  
  if (chromatic) {
    return CHROMATIC_NOTES.indexOf(cleanName as any);
  } else {
    return SOLFEGE_NOTES.findIndex(note => note === cleanName);
  }
}

/**
 * Generate primary color for a note
 */
export function getNoteColor(noteName: string, octave = 4): string {
  const noteIndex = getNoteIndex(noteName, false); // Use solfege mapping
  
  if (noteIndex === -1) {
    return "hsl(0, 70%, 60%)"; // Default red for invalid notes
  }
  
  // Simple hue calculation: distribute 7 solfege notes across color wheel
  const hue = (noteIndex * 51.4) % 360; // 360/7 ≈ 51.4
  
  // Octave affects lightness: lower octaves darker, higher lighter
  const lightness = Math.max(30, Math.min(80, 40 + (octave - 4) * 8));
  
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

/**
 * Generate colors with alpha transparency
 */
export function getNoteColorWithAlpha(noteName: string, alpha = 1, octave = 4): string {
  const noteIndex = getNoteIndex(noteName, false);
  
  if (noteIndex === -1) {
    return `hsla(0, 70%, 60%, ${alpha})`;
  }
  
  const hue = (noteIndex * 51.4) % 360;
  const lightness = Math.max(30, Math.min(80, 40 + (octave - 4) * 8));
  
  return `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
}

/**
 * Create glassmorphism background effect
 */
export function createGlassBackground(color: string, opacity = 0.3): string {
  // Extract HSL values and apply transparency
  const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `${color}${Math.round(opacity * 255).toString(16)}`;
  
  const [, h, s, l] = match;
  return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
}

/**
 * Create gradient for multiple notes
 */
export function createNoteGradient(noteNames: string[], direction = "135deg"): string {
  if (noteNames.length === 0) return "transparent";
  if (noteNames.length === 1) return getNoteColor(noteNames[0]);
  
  const colors = noteNames.map(name => getNoteColor(name));
  return `linear-gradient(${direction}, ${colors.join(", ")})`;
}

/**
 * Get complementary color (opposite on color wheel)
 */
export function getComplementaryColor(noteName: string, octave = 4): string {
  const noteIndex = getNoteIndex(noteName, false);
  
  if (noteIndex === -1) {
    return "hsl(180, 70%, 60%)"; // Complement of red
  }
  
  const hue = ((noteIndex * 51.4) + 180) % 360; // Add 180° for complement
  const lightness = Math.max(30, Math.min(80, 40 + (octave - 4) * 8));
  
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

/**
 * Simple color utilities for UI
 */
export const uiColors = {
  background: "hsl(220, 13%, 9%)",
  surface: "hsl(220, 13%, 13%)",
  accent: "hsl(280, 100%, 70%)",
  text: "hsl(220, 10%, 95%)",
  textSecondary: "hsl(220, 10%, 70%)",
  success: "hsl(120, 100%, 50%)",
  warning: "hsl(45, 100%, 50%)",
  error: "hsl(0, 100%, 50%)",
} as const;