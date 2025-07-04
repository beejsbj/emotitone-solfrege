import { computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { SEQUENCER_COLOR_PALETTES } from "@/data/sequencer";

export function useSequencerControls(sequencerId: string) {
  const sequencerStore = useSequencerStore();

  // Get current sequencer
  const sequencer = computed(() => {
    const targetId = sequencerId || sequencerStore.config.activeSequencerId;
    if (!targetId) return null;
    return sequencerStore.sequencers.find((s) => s.id === targetId);
  });

  // Current color palette
  const currentColorPalette = computed(() => {
    if (!sequencer.value?.color) return null;
    return SEQUENCER_COLOR_PALETTES.find(
      (p) => p.id === sequencer.value?.color
    );
  });

  // Get theme color from palette ID
  const getThemeColor = (paletteId?: string) => {
    const colorMap: Record<string, string> = {
      neon: "hsla(158, 100%, 53%, 1)",
      sunset: "hsla(21, 90%, 48%, 1)",
      ocean: "hsla(217, 91%, 60%, 1)",
      purple: "hsla(271, 91%, 65%, 1)",
      pink: "hsla(328, 85%, 70%, 1)",
      gold: "hsla(43, 96%, 56%, 1)",
    };

    return paletteId ? colorMap[paletteId] || colorMap.neon : null;
  };

  // Simple theme colors for UI
  const themeColors = computed(() => {
    if (!sequencer.value?.color) return null;

    const primaryColor = getThemeColor(sequencer.value.color);
    if (!primaryColor) return null;

    return {
      primary: primaryColor,
      secondary: "hsla(0, 84%, 60%, 1)", // red for stop state
      accent: "hsla(0, 84%, 60%, 1)", // red for mute/delete
    };
  });

  // Dynamic styles based on color theme
  const dynamicStyles = computed(() => {
    const theme = themeColors.value;
    if (!theme) return {};

    return {
      "--theme-primary": theme.primary,
      "--theme-secondary": theme.secondary,
      "--theme-accent": theme.accent,
    };
  });

  return {
    sequencer,
    currentColorPalette,
    themeColors,
    dynamicStyles,
    getThemeColor,
  };
}
