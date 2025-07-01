/**
 * Ambient Renderer Composable
 * Renders background ambient effects
 */

import type { AmbientConfig } from "@/types";
import { useColorSystem } from "../useColorSystem";

export function useAmbientRenderer() {
  /**
   * Render subtle texture overlay
   */
  const renderSubtleTexture = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.globalAlpha = 0.03;

    // Create subtle grain texture using random dots
    const density = 0.0008; // Lower density for subtlety
    const timeOffset = elapsed * 0.00005;

    for (let i = 0; i < canvasWidth * canvasHeight * density; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;

      // Add slight animation to the grain
      const animatedX = x + Math.sin(timeOffset + i * 0.01) * 0.5;
      const animatedY = y + Math.cos(timeOffset + i * 0.01) * 0.5;

      // Vary the brightness slightly
      const brightness = 200 + Math.random() * 55;
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.8)`;

      ctx.fillRect(animatedX, animatedY, 1, 1);
    }

    ctx.globalAlpha = 1;
  };

  /**
   * Render ambient background
   */
  const renderAmbientBackground = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    ambientConfig: AmbientConfig,
    canvasWidth: number,
    canvasHeight: number,
    _musicStore: any,
    getCachedGradient: (
      key: string,
      createFn: () => CanvasGradient
    ) => CanvasGradient
  ) => {
    if (!ctx) return;

    // Simple black background with subtle warm lighting
    const gradientKey = `ambient-warm`;
    const gradient = getCachedGradient(gradientKey, () => {
      const grad = ctx.createRadialGradient(
        canvasWidth * 0.5,
        canvasHeight * 0.3,
        0,
        canvasWidth * 0.5,
        canvasHeight * 0.3,
        Math.max(canvasWidth, canvasHeight) * 0.8
      );

      // Warm subtle lighting on black
      grad.addColorStop(0, "rgba(40, 30, 20, 0.3)"); // Warm center
      grad.addColorStop(0.6, "rgba(20, 15, 10, 0.6)"); // Darker warm
      grad.addColorStop(1, "rgba(0, 0, 0, 0.9)"); // Black edges

      return grad;
    });

    // Fill with black first
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Apply warm lighting gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add subtle texture
    renderSubtleTexture(ctx, elapsed, canvasWidth, canvasHeight);
  };

  return {
    renderAmbientBackground,
  };
}
