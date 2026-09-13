import { createHarmonicTypography, type HarmonicLabelFrame } from "./harmonicTypography";
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
  const paintTypography = createHarmonicTypography();
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
    const hasCompleteAnalysis =
      resolvedPoints.length === snapshot.displayedNotes.length;

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
        roles: ["interval"],
        angle: Math.atan2(orderedPoints[1].y - orderedPoints[0].y, orderedPoints[1].x - orderedPoints[0].x),
        size: "md",
      });
    }

    const primaryLabelLines = hasCompleteAnalysis
      ? [
          ...(config.showChordLabel && snapshot.chordLabel
            ? [snapshot.chordLabel]
            : []),
          ...(config.showEmotionLabel && snapshot.emotionalDescription
            ? [snapshot.emotionalDescription]
            : []),
        ]
      : [];

    if (primaryLabelLines.length > 0) {
      primaryLabel = {
        x: centroid.x,
        y: centroid.y,
        lines: primaryLabelLines,
        roles: [
          ...(config.showChordLabel && snapshot.chordLabel ? ["chord" as const] : []),
          ...(config.showEmotionLabel && snapshot.emotionalDescription ? ["emotion" as const] : []),
        ],
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
          roles: ["interval"],
          angle: Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x),
          size: "sm",
        });
      });
    }

    return {
      viewport: { width: canvasWidth, height: canvasHeight },
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

  const renderLabels = (
    ctx: CanvasRenderingContext2D,
    scene: HarmonicGeometryScene | null,
    config: BlobRelationshipConfig,
    frame?: HarmonicLabelFrame
  ) => paintTypography(ctx, scene, config.labelOpacity, config.showIntervalLabels, frame);

  return {
    buildScene,
    renderLabels,
  };
}
