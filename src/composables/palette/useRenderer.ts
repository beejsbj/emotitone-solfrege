/**
 * Palette Rendering System
 * Handles canvas rendering for the palette components
 */

import { type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { shouldShowKeyboardShortcuts } from "@/utils/deviceDetection";
import { PALETTE_STYLES } from "./index";
import type {
  PaletteState,
  ButtonLayout,
  ControlLayout,
  AnimationState,
} from "@/types";

/**
 * Helper function to render Lucide icon SVG paths on canvas
 */
function renderLucideIcon(
  ctx: CanvasRenderingContext2D,
  iconPath: string,
  x: number,
  y: number,
  size: number = 16,
  strokeWidth: number = 2
) {
  ctx.save();

  // Set up the coordinate system for the icon (24x24 viewBox)
  const scale = size / 24;
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);

  // Create and stroke the path
  const path = new Path2D(iconPath);
  ctx.lineWidth = strokeWidth / scale; // Adjust stroke width for scaling
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(path);

  ctx.restore();
}

export function usePaletteRenderer(
  paletteState: Ref<PaletteState>,
  animationState: Ref<AnimationState>,
  calculateButtonLayouts: () => ButtonLayout[],
  calculateControlLayouts: () => ControlLayout,
  visibleSolfegeData: Ref<any[]>,
  getKeyboardLetterForNote?: (
    solfegeIndex: number,
    octave: number
  ) => string | null
) {
  const musicStore = useMusicStore();
  const { getStaticPrimaryColor, getGradient } = useColorSystem();
  const { isNoteActiveForSolfege } = useSolfegeInteraction();
  const { paletteConfig } = useVisualConfig();

  // Check if we should show keyboard shortcuts (desktop only)
  const showKeyboardShortcuts = shouldShowKeyboardShortcuts();

  /**
   * Create a canvas gradient from CSS gradient string
   */
  const createCanvasGradient = (
    ctx: CanvasRenderingContext2D,
    cssGradient: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): CanvasGradient | null => {
    const config = PALETTE_STYLES.rendering.gradient;

    // Create linear gradient based on direction (0-360 degrees)
    // Use configurable direction from visual config, fallback to palette styles
    const direction = paletteConfig.value.gradientDirection ?? config.direction;
    // Convert angle to radians and calculate end points
    const angleInRadians = (direction * Math.PI) / 180;

    // Calculate the gradient line endpoints
    // For a rectangle, we need to find where the angle intersects the edges
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Calculate the maximum distance from center to any corner
    const maxDistance = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    // Calculate start and end points along the angle
    const startX = centerX - Math.cos(angleInRadians) * maxDistance;
    const startY = centerY - Math.sin(angleInRadians) * maxDistance;
    const endX = centerX + Math.cos(angleInRadians) * maxDistance;
    const endY = centerY + Math.sin(angleInRadians) * maxDistance;

    const canvasGradient = ctx.createLinearGradient(startX, startY, endX, endY);

    // Parse CSS gradient to extract colors
    const colors = cssGradient.match(config.colorRegex) || [];

    if (colors.length >= 2 && colors[0] && colors[1]) {
      canvasGradient.addColorStop(0, colors[0]);
      canvasGradient.addColorStop(1, colors[1]);
      return canvasGradient;
    } else if (colors.length === 1 && colors[0]) {
      // Single color - create subtle gradient with transparency
      canvasGradient.addColorStop(0, colors[0]);
      canvasGradient.addColorStop(1, colors[0] + config.transparencySuffix);
      return canvasGradient;
    }

    // Fallback gradient
    config.fallbackStops.forEach((stop) => {
      canvasGradient.addColorStop(stop.offset, stop.color);
    });

    return canvasGradient;
  };

  /**
   * Render the palette background with exact Tailwind styling
   */
  const renderPaletteBackground = (ctx: CanvasRenderingContext2D) => {
    const state = paletteState.value;

    // Main palette background (bg-white/10 backdrop-blur-sm border) - Tailwind exact
    ctx.save();

    // Background with transparency (bg-white/10)
    ctx.fillStyle = PALETTE_STYLES.colors.background.palette;
    ctx.fillRect(state.x, state.y, state.width, state.height);

    // Border (border class default)
    ctx.strokeStyle = PALETTE_STYLES.colors.borders.main;
    ctx.lineWidth = PALETTE_STYLES.rendering.lineWidth.border;
    ctx.strokeRect(state.x, state.y, state.width, state.height);

    ctx.restore();
  };

  /**
   * Render control bar with exact Tailwind styling
   */
  const renderControls = (ctx: CanvasRenderingContext2D) => {
    const controls = calculateControlLayouts();

    ctx.save();

    // Control bar background (bg-gray-800) - Tailwind exact color
    ctx.fillStyle = PALETTE_STYLES.colors.background.controls;
    ctx.fillRect(
      controls.leftFlick.x,
      controls.leftFlick.y,
      paletteState.value.width,
      paletteState.value.controlsHeight
    );

    // Left flick area (bg-gray-700/50 hover:bg-gray-600/50) - Tailwind exact colors
    ctx.fillStyle = PALETTE_STYLES.colors.background.flickArea;
    ctx.fillRect(
      controls.leftFlick.x,
      controls.leftFlick.y,
      controls.leftFlick.width,
      controls.leftFlick.height
    );

    // Left flick indicator (chevron up icon)
    ctx.strokeStyle = PALETTE_STYLES.colors.text.control;
    renderLucideIcon(
      ctx,
      PALETTE_STYLES.lucideIcons.chevronUp,
      controls.leftFlick.x + controls.leftFlick.width / 2,
      controls.leftFlick.y + controls.leftFlick.height / 2,
      PALETTE_STYLES.symbols.iconSize.small,
      PALETTE_STYLES.symbols.iconStroke
    );

    // Resize handle (move-vertical icon) - now in center position
    ctx.strokeStyle = PALETTE_STYLES.colors.text.control;
    renderLucideIcon(
      ctx,
      PALETTE_STYLES.lucideIcons.moveVertical,
      controls.resizeHandle.x + controls.resizeHandle.width / 2,
      controls.resizeHandle.y + controls.resizeHandle.height / 2,
      PALETTE_STYLES.symbols.iconSize.medium,
      PALETTE_STYLES.symbols.iconStroke
    );

    // Drag handle (grip-horizontal icon) - now in 4th position
    ctx.strokeStyle = PALETTE_STYLES.colors.text.control;
    renderLucideIcon(
      ctx,
      PALETTE_STYLES.lucideIcons.gripHorizontal,
      controls.dragHandle.x + controls.dragHandle.width / 2,
      controls.dragHandle.y + controls.dragHandle.height / 2,
      PALETTE_STYLES.symbols.iconSize.small,
      PALETTE_STYLES.symbols.iconStroke
    );

    // Right flick area
    ctx.fillStyle = PALETTE_STYLES.colors.background.flickArea;
    ctx.fillRect(
      controls.rightFlick.x,
      controls.rightFlick.y,
      controls.rightFlick.width,
      controls.rightFlick.height
    );

    // Right flick indicator (chevron right icon)
    ctx.strokeStyle = PALETTE_STYLES.colors.text.control;
    renderLucideIcon(
      ctx,
      PALETTE_STYLES.lucideIcons.chevronDown,
      controls.rightFlick.x + controls.rightFlick.width / 2,
      controls.rightFlick.y + controls.rightFlick.height / 2,
      PALETTE_STYLES.symbols.iconSize.small,
      PALETTE_STYLES.symbols.iconStroke
    );

    ctx.restore();
  };

  /**
   * Render a single button with proper styling and pressed states
   */
  const renderButton = (
    ctx: CanvasRenderingContext2D,
    layout: ButtonLayout
  ) => {
    if (!layout.isVisible) return;

    const solfege = visibleSolfegeData.value[layout.solfegeIndex];
    const scaleNote = musicStore.currentScaleNotes[layout.solfegeIndex];
    const isActive = isNoteActiveForSolfege(solfege.name, layout.octave);
    const buttonKey = `${solfege.name}-${layout.octave}`;

    ctx.save();

    // Get or create button animation state
    let buttonAnimation = animationState.value.buttonAnimations.get(buttonKey);
    if (!buttonAnimation) {
      buttonAnimation = {
        scale: 1.0,
        targetScale: 1.0,
        isAnimating: false,
        startTime: 0,
        isPressed: false,
      };
      animationState.value.buttonAnimations.set(buttonKey, buttonAnimation);
    }

    // Calculate button dimensions with smooth animated scaling
    const currentScale = buttonAnimation.scale;
    const scaleOffset = (layout.width * (1 - currentScale)) / 2;

    const buttonX = layout.x + scaleOffset;
    const buttonY = layout.y + scaleOffset;
    const buttonWidth = layout.width * currentScale;
    const buttonHeight = layout.height * currentScale;

    // Button background - use color system like DOM version
    if (!isActive) {
      // Static color background
      const primaryColor = getStaticPrimaryColor(
        solfege.name,
        musicStore.currentMode,
        layout.octave
      );
      ctx.fillStyle = primaryColor;
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    } else {
      // Active state - use reactive gradient
      const gradient = getGradient(solfege.name, musicStore.currentMode);
      if (gradient) {
        // Use consolidated gradient creation
        const canvasGradient = createCanvasGradient(
          ctx,
          gradient,
          buttonX,
          buttonY,
          buttonWidth,
          buttonHeight
        );

        if (canvasGradient) {
          ctx.fillStyle = canvasGradient;
        } else {
          // Fallback to primary color
          ctx.fillStyle = getStaticPrimaryColor(
            solfege.name,
            musicStore.currentMode,
            layout.octave
          );
        }
      } else {
        ctx.fillStyle = getStaticPrimaryColor(
          solfege.name,
          musicStore.currentMode,
          layout.octave
        );
      }
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Add pressed effect overlay for gradient buttons
      if (buttonAnimation.isPressed && gradient) {
        ctx.fillStyle = PALETTE_STYLES.rendering.gradient.pressedEffect.overlay;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      }
    }

    // Backdrop blur effect simulation (subtle overlay)
    ctx.fillStyle = PALETTE_STYLES.colors.button.overlay;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Button border
    ctx.strokeStyle = PALETTE_STYLES.colors.borders.button;
    ctx.lineWidth = PALETTE_STYLES.rendering.button.borderWidth;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Text rendering with configurable styling
    ctx.textAlign = PALETTE_STYLES.rendering.textAlign;
    ctx.textBaseline = PALETTE_STYLES.rendering.textBaseline;

    const centerX = buttonX + buttonWidth / 2;
    const centerY = buttonY + buttonHeight / 2;

    // Determine text color based on note type (white for natural, black for sharp/flat)
    const isSharpFlat =
      scaleNote.includes("#") ||
      scaleNote.includes("♭") ||
      scaleNote.includes("b");
    const textColor = isSharpFlat
      ? PALETTE_STYLES.colors.text.sharp
      : PALETTE_STYLES.colors.text.natural;

    if (layout.isMainOctave) {
      // Main octave: large solfege name + small note name
      ctx.font = `${PALETTE_STYLES.fonts.weights.semibold} ${PALETTE_STYLES.fonts.sizes.lg}px ${PALETTE_STYLES.fonts.family}`;
      ctx.fillStyle = textColor;
      ctx.fillText(solfege.name, centerX, centerY - 8);

      // Octave number with secondary styling
      ctx.font = `${PALETTE_STYLES.fonts.weights.normal} ${PALETTE_STYLES.fonts.sizes.sm}px ${PALETTE_STYLES.fonts.systemFamily}`;
      ctx.fillStyle = PALETTE_STYLES.colors.text.octave;
      ctx.fillText(`${scaleNote}${layout.octave}`, centerX, centerY + 8);
    } else {
      // Other octaves: small note name only
      ctx.font = `${PALETTE_STYLES.fonts.weights.semibold} ${PALETTE_STYLES.fonts.sizes.sm}px ${PALETTE_STYLES.fonts.systemFamily}`;
      ctx.fillStyle = textColor;
      ctx.fillText(`${scaleNote}${layout.octave}`, centerX, centerY);
    }

    // Add keyboard letter box on desktop
    if (showKeyboardShortcuts && getKeyboardLetterForNote) {
      const keyboardLetter = getKeyboardLetterForNote(
        layout.solfegeIndex,
        layout.octave
      );
      if (keyboardLetter) {
        // Small box in top-right corner
        const boxSize = 16;
        const boxPadding = 4;
        const boxX = buttonX + buttonWidth - boxSize - boxPadding;
        const boxY = buttonY + boxPadding;

        // Box background (semi-transparent dark)
        ctx.fillStyle = "hsla(0, 0%, 0%, 0.6)";
        ctx.fillRect(boxX, boxY, boxSize, boxSize);

        // Box border
        ctx.strokeStyle = "hsla(0, 0%, 100%, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxSize, boxSize);

        // Keyboard letter text
        ctx.font = `${PALETTE_STYLES.fonts.weights.semibold} ${PALETTE_STYLES.fonts.sizes.xs}px ${PALETTE_STYLES.fonts.systemFamily}`;
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(keyboardLetter, boxX + boxSize / 2, boxY + boxSize / 2);

        // Reset text alignment for next renders
        ctx.textAlign = PALETTE_STYLES.rendering.textAlign;
        ctx.textBaseline = PALETTE_STYLES.rendering.textBaseline;
      }
    }

    ctx.restore();
  };

  /**
   * Main render function with animation updates
   */
  const renderPalette = (
    ctx: CanvasRenderingContext2D,
    currentTime?: number,
    updateAnimation?: (time: number) => boolean
  ) => {
    // Update animations if time provided
    if (currentTime !== undefined && updateAnimation) {
      updateAnimation(currentTime);
    }

    // Render background
    renderPaletteBackground(ctx);

    // Render buttons first (prevent overlap with controls)
    const buttonLayouts = calculateButtonLayouts();
    buttonLayouts.forEach((layout) => {
      // Ensure buttons don't overlap with controls
      if (
        layout.y >=
        paletteState.value.y + paletteState.value.controlsHeight
      ) {
        renderButton(ctx, layout);
      }
    });

    // Render controls on top (higher z-index)
    renderControls(ctx);
  };

  return {
    // Rendering functions
    renderPalette,
    renderPaletteBackground,
    renderControls,
    renderButton,
  };
}
