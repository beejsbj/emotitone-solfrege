import type {
  ActiveBlob,
  HarmonicGeometryLabel,
  HarmonicGeometryPoint,
  HarmonicGeometryScene,
} from "@/types/canvas";
import { useColorSystem } from "@/composables/useColorSystem";
import type {
  HarmonicGeometryConfig,
  HarmonicAnalysisSnapshot,
  HarmonicIntervalEdge,
} from "@/types";

function averagePoint(points: Array<{ x: number; y: number }>) {
  const totals = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function averageRadius(
  points: Array<{ x: number; y: number }>,
  centroid: { x: number; y: number }
) {
  return (
    points.reduce(
      (accumulator, point) =>
        accumulator + Math.hypot(point.x - centroid.x, point.y - centroid.y),
      0
    ) / points.length
  );
}

function findIntervalEdge(
  intervalEdges: readonly HarmonicIntervalEdge[],
  fromNoteId: string,
  toNoteId: string
) {
  return (
    intervalEdges.find(
      (edge) =>
        (edge.fromNoteId === fromNoteId && edge.toNoteId === toNoteId) ||
        (edge.fromNoteId === toNoteId && edge.toNoteId === fromNoteId)
    ) ?? null
  );
}

function getArcMidpoint(
  from: HarmonicGeometryPoint,
  to: HarmonicGeometryPoint,
  curvature = 0.18
) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const offset = Math.min(100, distance * curvature);
  const normalX = -dy / distance;
  const normalY = dx / distance;

  return {
    controlX: midX + normalX * offset,
    controlY: midY + normalY * offset,
    labelX: midX + normalX * offset * 0.72,
    labelY: midY + normalY * offset * 0.72,
  };
}

export function useHarmonicGeometryRenderer() {
  const { getPrimaryColor, getAccentColor, withAlpha } = useColorSystem();

  const resolvePoints = (
    snapshot: HarmonicAnalysisSnapshot,
    activeBlobs: Map<string, ActiveBlob>,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    return snapshot.displayedNotes
      .map((note) => {
        const blob =
          activeBlobs.get(note.noteId) ?? activeBlobs.get(note.solfege.name);

        if (!blob) {
          return null;
        }

        return {
          note,
          blob,
          x: blob.x,
          y: blob.y,
          primaryColor: getPrimaryColor(
            note.solfege.name,
            note.mode,
            note.octave,
            note.key
          ),
          accentColor: getAccentColor(
            note.solfege.name,
            note.mode,
            note.octave,
            note.key
          ),
          angle: Math.atan2(blob.y - centerY, blob.x - centerX),
        } satisfies HarmonicGeometryPoint;
      })
      .filter((point): point is HarmonicGeometryPoint => Boolean(point));
  };

  const buildScene = (
    snapshot: HarmonicAnalysisSnapshot,
    activeBlobs: Map<string, ActiveBlob>,
    config: HarmonicGeometryConfig,
    canvasWidth: number,
    canvasHeight: number
  ): HarmonicGeometryScene | null => {
    if (!config.isEnabled || !snapshot.isVisible || snapshot.displayedNotes.length < 2) {
      return null;
    }

    const points = resolvePoints(snapshot, activeBlobs, canvasWidth, canvasHeight);
    if (
      points.length < 2 ||
      points.length !== snapshot.displayedNotes.length
    ) {
      return null;
    }

    const orderedPoints = [...points].sort((left, right) => left.angle - right.angle);
    const centroid = averagePoint(points);
    const radius = averageRadius(points, centroid);

    const boundaryEdges =
      orderedPoints.length >= 3
        ? orderedPoints
            .map((point, index) => {
              const nextPoint = orderedPoints[(index + 1) % orderedPoints.length];
              return findIntervalEdge(
                snapshot.intervalEdges,
                point.note.noteId,
                nextPoint.note.noteId
              );
            })
            .filter((edge): edge is HarmonicIntervalEdge => Boolean(edge))
        : [];

    const boundaryPairs = new Set(
      boundaryEdges.map((edge) =>
        [edge.fromNoteId, edge.toNoteId].sort().join("::")
      )
    );

    const interiorEdges = snapshot.intervalEdges.filter((edge) => {
      const edgeKey = [edge.fromNoteId, edge.toNoteId].sort().join("::");
      return !boundaryPairs.has(edgeKey);
    });

    const auxiliaryLabels: HarmonicGeometryLabel[] = [];
    let primaryLabel: HarmonicGeometryLabel | null = null;

    const dyadEdge =
      orderedPoints.length === 2
        ? findIntervalEdge(
            snapshot.intervalEdges,
            orderedPoints[0].note.noteId,
            orderedPoints[1].note.noteId
          )
        : null;

    if (orderedPoints.length === 2 && dyadEdge) {
      const arcMidpoint = getArcMidpoint(orderedPoints[0], orderedPoints[1]);
      auxiliaryLabels.push({
        x: arcMidpoint.labelX,
        y: arcMidpoint.labelY,
        lines: [dyadEdge.interval],
        size: "md",
      });
    }

    const primaryLabelLines = [
      ...(config.showChord && snapshot.chordLabel
        ? [snapshot.chordLabel]
        : []),
      ...(config.showEmotionalDescription && snapshot.emotionalDescription
        ? [snapshot.emotionalDescription]
        : []),
    ];

    if (primaryLabelLines.length > 0) {
      primaryLabel = {
        x: centroid.x,
        y: centroid.y,
        lines: primaryLabelLines,
        size: orderedPoints.length >= 4 ? "lg" : "md",
      };
    }

    if (
      orderedPoints.length >= 4 &&
      config.showIntervals &&
      config.geometryMode !== "center-only"
    ) {
      orderedPoints.forEach((point, index) => {
        const nextPoint = orderedPoints[(index + 1) % orderedPoints.length];
        const edge = findIntervalEdge(
          snapshot.intervalEdges,
          point.note.noteId,
          nextPoint.note.noteId
        );

        if (!edge) {
          return;
        }

        const midX = (point.x + nextPoint.x) / 2;
        const midY = (point.y + nextPoint.y) / 2;
        const distance = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);

        if (distance < 90) {
          return;
        }

        auxiliaryLabels.push({
          x: midX,
          y: midY,
          lines: [edge.interval],
          size: "sm",
        });
      });
    }

    return {
      points,
      orderedPoints,
      centroid,
      radius,
      boundaryEdges,
      interiorEdges,
      primaryLabel,
      auxiliaryLabels,
    };
  };

  const drawGradientStroke = (
    ctx: CanvasRenderingContext2D,
    from: HarmonicGeometryPoint,
    to: HarmonicGeometryPoint,
    opacity: number,
    width = 2.25
  ) => {
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, withAlpha(from.primaryColor, opacity));
    gradient.addColorStop(0.5, withAlpha(from.accentColor, opacity * 0.72));
    gradient.addColorStop(1, withAlpha(to.primaryColor, opacity));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const drawBackdropFill = (
    ctx: CanvasRenderingContext2D,
    scene: HarmonicGeometryScene,
    config: HarmonicGeometryConfig
  ) => {
    if (scene.orderedPoints.length < 3) {
      return;
    }

    const gradient = ctx.createRadialGradient(
      scene.centroid.x,
      scene.centroid.y,
      0,
      scene.centroid.x,
      scene.centroid.y,
      scene.radius * 1.35
    );

    scene.orderedPoints.forEach((point, index) => {
      const stop =
        scene.orderedPoints.length === 1
          ? 0
          : index / Math.max(1, scene.orderedPoints.length - 1);
      gradient.addColorStop(
        stop * 0.72,
        withAlpha(
          point.primaryColor,
          config.glassmorphOpacity * config.opacity * 0.32
        )
      );
    });
    gradient.addColorStop(1, "transparent");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    scene.orderedPoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    points: HarmonicGeometryPoint[],
    opacity: number
  ) => {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = withAlpha(points[0]?.primaryColor ?? "white", opacity);
    ctx.stroke();
  };

  const renderGeometry = (
    ctx: CanvasRenderingContext2D,
    scene: HarmonicGeometryScene | null,
    config: HarmonicGeometryConfig
  ) => {
    if (!scene || config.opacity <= 0) {
      return;
    }

    const geometryOpacity = config.opacity * 0.65;
    const glowBlur = Math.max(0, config.backdropBlur * 1.1);

    ctx.save();
    ctx.shadowBlur = glowBlur;
    ctx.shadowColor = withAlpha(
      scene.orderedPoints[0]?.primaryColor ?? "hsla(0, 0%, 100%, 1)",
      Math.min(0.4, config.glassmorphOpacity * config.opacity * 0.6)
    );

    if (scene.orderedPoints.length === 2) {
      const [fromPoint, toPoint] = scene.orderedPoints;
      const arcMidpoint = getArcMidpoint(fromPoint, toPoint);

      ctx.beginPath();
      ctx.moveTo(fromPoint.x, fromPoint.y);
      ctx.quadraticCurveTo(
        arcMidpoint.controlX,
        arcMidpoint.controlY,
        toPoint.x,
        toPoint.y
      );
      drawGradientStroke(ctx, fromPoint, toPoint, geometryOpacity, 2.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    drawBackdropFill(ctx, scene, config);

    if (config.geometryMode !== "center-only") {
      scene.orderedPoints.forEach((point, index) => {
        const nextPoint = scene.orderedPoints[(index + 1) % scene.orderedPoints.length];
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        drawGradientStroke(ctx, point, nextPoint, geometryOpacity);
        ctx.stroke();
      });
    } else {
      ctx.lineWidth = 1.5;
      drawPolygon(ctx, scene.orderedPoints, geometryOpacity * 0.45);
    }

    if (config.geometryMode === "web") {
      scene.interiorEdges.forEach((edge) => {
        const fromPoint = scene.points.find(
          (point) => point.note.noteId === edge.fromNoteId
        );
        const toPoint = scene.points.find(
          (point) => point.note.noteId === edge.toNoteId
        );

        if (!fromPoint || !toPoint) {
          return;
        }

        ctx.beginPath();
        ctx.moveTo(fromPoint.x, fromPoint.y);
        ctx.lineTo(toPoint.x, toPoint.y);
        drawGradientStroke(ctx, fromPoint, toPoint, geometryOpacity * 0.58, 1.2);
        ctx.stroke();
      });
    }

    ctx.restore();
  };

  const drawKnockoutText = (
    ctx: CanvasRenderingContext2D,
    label: HarmonicGeometryLabel,
    opacity: number
  ) => {
    const sizeMap = {
      sm: {
        primaryFont: '600 11px "IBM Plex Mono", "SFMono-Regular", monospace',
        secondaryFont: '500 9px "IBM Plex Mono", "SFMono-Regular", monospace',
        lineHeight: 12,
        strokeWidth: 4,
      },
      md: {
        primaryFont: '700 16px "IBM Plex Mono", "SFMono-Regular", monospace',
        secondaryFont: '500 11px "IBM Plex Mono", "SFMono-Regular", monospace',
        lineHeight: 16,
        strokeWidth: 5,
      },
      lg: {
        primaryFont: '700 18px "IBM Plex Mono", "SFMono-Regular", monospace',
        secondaryFont: '500 12px "IBM Plex Mono", "SFMono-Regular", monospace',
        lineHeight: 18,
        strokeWidth: 6,
      },
    }[label.size];

    const totalHeight = (label.lines.length - 1) * sizeMap.lineHeight;
    const startY = label.y - totalHeight / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `hsla(0, 0%, 0%, ${0.78 * opacity})`;
    ctx.fillStyle = `hsla(0, 0%, 100%, ${0.96 * opacity})`;

    label.lines.forEach((line, index) => {
      ctx.font = index === 0 ? sizeMap.primaryFont : sizeMap.secondaryFont;
      ctx.lineWidth = sizeMap.strokeWidth;
      const lineY = startY + index * sizeMap.lineHeight;
      ctx.strokeText(line, label.x, lineY);
      ctx.fillText(line, label.x, lineY);
    });

    ctx.restore();
  };

  const renderLabels = (
    ctx: CanvasRenderingContext2D,
    scene: HarmonicGeometryScene | null,
    config: HarmonicGeometryConfig
  ) => {
    if (!scene || config.opacity <= 0) {
      return;
    }

    if (scene.orderedPoints.length === 2 && config.showIntervals) {
      scene.auxiliaryLabels.forEach((label) =>
        drawKnockoutText(ctx, label, config.opacity)
      );
    }

    if (scene.primaryLabel) {
      drawKnockoutText(ctx, scene.primaryLabel, config.opacity);
    }

    if (
      config.showIntervals &&
      config.geometryMode !== "center-only" &&
      scene.orderedPoints.length >= 4
    ) {
      scene.auxiliaryLabels.forEach((label) =>
        drawKnockoutText(ctx, label, config.opacity)
      );
    }
  };

  return {
    buildScene,
    renderGeometry,
    renderLabels,
  };
}
