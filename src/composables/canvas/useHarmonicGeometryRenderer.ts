import type {
  ActiveBlob,
  HarmonicGeometryLabel,
  HarmonicGeometryPoint,
  HarmonicGeometryScene,
} from "@/types/canvas";
import type {
  BlobRelationshipConfig,
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
  const resolvePoints = (
    snapshot: HarmonicAnalysisSnapshot,
    activeBlobs: Map<string, ActiveBlob>
  ) => {
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
          angle: 0,
        } satisfies HarmonicGeometryPoint;
      })
      .filter((point): point is HarmonicGeometryPoint => Boolean(point));
  };

  const buildScene = (
    snapshot: HarmonicAnalysisSnapshot,
    activeBlobs: Map<string, ActiveBlob>,
    config: BlobRelationshipConfig,
    canvasWidth: number,
    canvasHeight: number
  ): HarmonicGeometryScene | null => {
    if (
      config.connectionMode === "off" ||
      !snapshot.isVisible ||
      snapshot.displayedNotes.length < 2
    ) {
      return null;
    }

    const resolvedPoints = resolvePoints(snapshot, activeBlobs);
    if (resolvedPoints.length < 2) {
      return null;
    }

    const centroid = averagePoint(resolvedPoints);
    const points = resolvedPoints.map((point) => ({
      ...point,
      angle: Math.atan2(point.y - centroid.y, point.x - centroid.x),
    }));
    const orderedPoints = [...points].sort(
      (left, right) => left.angle - right.angle
    );
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
      ...(config.showChordLabel && snapshot.chordLabel
        ? [snapshot.chordLabel]
        : []),
      ...(config.showEmotionLabel && snapshot.emotionalDescription
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
      orderedPoints.length >= 3 &&
      config.showIntervalLabels
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
    const horizontalPadding = 12;
    const canvasWidth = ctx.canvas?.width ?? 1024;
    const safeInset = Math.min(canvasWidth / 2, 48);
    const labelX = Math.max(
      safeInset,
      Math.min(canvasWidth - safeInset, label.x)
    );
    const maxWidth = Math.max(
      1,
      Math.min(
        canvasWidth - horizontalPadding * 2,
        (labelX - horizontalPadding) * 2,
        (canvasWidth - horizontalPadding - labelX) * 2
      )
    );

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
      ctx.strokeText(line, labelX, lineY, maxWidth);
      ctx.fillText(line, labelX, lineY, maxWidth);
    });

    ctx.restore();
  };

  const renderLabels = (
    ctx: CanvasRenderingContext2D,
    scene: HarmonicGeometryScene | null,
    config: BlobRelationshipConfig
  ) => {
    if (!scene || config.labelOpacity <= 0) {
      return;
    }

    if (scene.orderedPoints.length === 2 && config.showIntervalLabels) {
      scene.auxiliaryLabels.forEach((label) =>
        drawKnockoutText(ctx, label, config.labelOpacity)
      );
    }

    if (scene.primaryLabel) {
      drawKnockoutText(ctx, scene.primaryLabel, config.labelOpacity);
    }

    if (
      config.showIntervalLabels &&
      scene.orderedPoints.length >= 3
    ) {
      scene.auxiliaryLabels.forEach((label) =>
        drawKnockoutText(ctx, label, config.labelOpacity)
      );
    }
  };

  return {
    buildScene,
    renderLabels,
  };
}
