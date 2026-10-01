import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LoopDial from "@/components/primatives/LoopDial.vue";
import loopDialSource from "@/components/primatives/LoopDial.vue?raw";

type Point = { x: number; y: number };
type Arc = {
  start: Point;
  end: Point;
  radius: number;
  large: number;
  sweep: number;
};

// Read SVG output rather than calling or reproducing the component's arc builder.
function readArcs(path: string): Arc[] {
  const tokens = path.trim().split(/[\s,]+/);
  expect(tokens.shift()).toBe("M");
  expect(tokens[0]).toMatch(/^-?\d+\.\d{2}$/);
  expect(tokens[1]).toMatch(/^-?\d+\.\d{2}$/);
  let start = { x: Number(tokens.shift()), y: Number(tokens.shift()) };
  const arcs: Arc[] = [];

  while (tokens.length && tokens[0] !== "Z") {
    expect(tokens.shift()).toBe("A");
    expect(tokens[5]).toMatch(/^-?\d+\.\d{2}$/);
    expect(tokens[6]).toMatch(/^-?\d+\.\d{2}$/);
    const [radius, ry, rotation, large, sweep, x, y] = tokens.splice(0, 7).map(Number);
    expect([start.x, start.y, radius, ry, rotation, large, sweep, x, y].every(Number.isFinite))
      .toBe(true);
    expect(ry).toBe(radius);
    expect(rotation).toBe(0);
    expect(radius).toBeGreaterThan(0);
    const end = { x, y };
    // Rounded endpoints must still lie on the specified circle about (17, 17).
    expect(Math.abs(Math.hypot(start.x - 17, start.y - 17) - radius)).toBeLessThan(0.01);
    expect(Math.abs(Math.hypot(end.x - 17, end.y - 17) - radius)).toBeLessThan(0.01);
    arcs.push({ start, end, radius, large, sweep });
    start = end;
  }

  expect(tokens).toEqual(tokens.length ? ["Z"] : []);
  expect(arcs.length).toBeGreaterThan(0);
  return arcs;
}

function turnFromTwelve(point: Point): number {
  const turn = Math.atan2(point.x - 17, 17 - point.y) / (2 * Math.PI);
  return (turn + 1) % 1;
}

function clockwiseTurns(arc: Arc): number {
  return (turnFromTwelve(arc.end) - turnFromTwelve(arc.start) + 1) % 1;
}

describe("LoopDial", () => {
  it("renders an accessible 34-unit dial, circular well, and fixed start tick", () => {
    const wrapper = mount(LoopDial, { props: { segments: [] } });

    expect(wrapper.element.tagName.toLowerCase()).toBe("svg");
    expect(wrapper.classes()).toContain("loop-dial");
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("viewBox")).toBe("0 0 34 34");
    expect(wrapper.attributes("aria-label")).toBe("Pattern note timeline");
    expect(wrapper.get("circle").attributes()).toMatchObject({ cx: "17", cy: "17", r: "17" });
    expect(wrapper.get("line.loop-dial__start").attributes()).toMatchObject({
      x1: "17", y1: "0.5", x2: "17", y2: "4.5",
    });
  });

  it("keeps Music Color events in chronological order with clockwise duration-proportional arcs", () => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [
          { color: "rgb(255, 0, 0)", durationMs: 100, height: 48 },
          { color: "rgb(0, 255, 0)", durationMs: 300, height: 52 },
          { color: "rgb(0, 0, 255)", durationMs: 25, height: 55 },
        ],
      },
    });

    const paths = wrapper.findAll("path.loop-dial__arc");
    expect(paths).toHaveLength(3);
    expect(paths.map((path) => (path.element as SVGElement).style.stroke)).toEqual([
      "rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)",
    ]);
    const arcs = paths.map((path) => {
      const commands = readArcs(path.attributes("d"));
      expect(commands).toHaveLength(1);
      return commands[0];
    });

    // 100:300:50 occupies 2/9, 2/3, 1/9 turns before the nominal 0.012-turn gaps.
    const boundaries = [0, 2 / 9, 8 / 9, 1];
    const spans = [2 / 9, 2 / 3, 1 / 9];
    arcs.forEach((arc, index) => {
      expect(arc.sweep).toBe(1);
      expect(arc.large).toBe(index === 1 ? 1 : 0);
      expect(turnFromTwelve(arc.start)).toBeCloseTo(boundaries[index] + 0.006, 3);
      expect(turnFromTwelve(arc.end)).toBeCloseTo(boundaries[index + 1] - 0.006, 3);
      expect(clockwiseTurns(arc)).toBeCloseTo(spans[index] - 0.012, 3);
    });
  });

  it.each([25, 0, -100])("floors a %sms event to 50ms before allocating its angular span", (durationMs) => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [
          { color: "red", durationMs, height: 55 },
          { color: "blue", durationMs: 150, height: 55 },
        ],
      },
    });

    const arcs = wrapper.findAll(".loop-dial__arc").map((path) => readArcs(path.attributes("d"))[0]);
    expect(arcs).toHaveLength(2);
    expect(clockwiseTurns(arcs[0])).toBeCloseTo(0.25 - 0.012, 3);
    expect(clockwiseTurns(arcs[1])).toBeCloseTo(0.75 - 0.012, 3);
    expect(turnFromTwelve(arcs[1].start)).toBeCloseTo(0.25 + 0.006, 3);
  });

  it("bounds the gap to half a short event's span so a huge duration difference does not erase it", () => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [
          { color: "red", durationMs: 1, height: 55 },
          { color: "blue", durationMs: 50_000, height: 55 },
        ],
      },
    });

    const paths = wrapper.findAll(".loop-dial__arc");
    expect(paths).toHaveLength(2);
    const short = readArcs(paths[0].attributes("d"))[0];
    const long = readArcs(paths[1].attributes("d"))[0];
    expect(short.end).not.toEqual(short.start);
    expect(short.sweep).toBe(1);
    expect(short.large).toBe(0);
    expect(clockwiseTurns(short)).toBeGreaterThan(0);
    // The floored short event owns 50/50050 turns; half remains visible,
    // with one quarter removed at each endpoint. Allow two-decimal rounding.
    expect(Math.abs(clockwiseTurns(short) - 25 / 50_050)).toBeLessThan(0.00015);
    expect(Math.abs(turnFromTwelve(short.start) - 12.5 / 50_050)).toBeLessThan(0.00012);
    expect(Math.abs(turnFromTwelve(short.end) - 37.5 / 50_050)).toBeLessThan(0.00012);
    expect(long.large).toBe(1);
    expect(long.sweep).toBe(1);
    expect(clockwiseTurns(long)).toBeCloseTo(50_000 / 50_050 - 0.012, 3);
  });

  it("normalizes chromatic pitch height into radii without changing repeated pitches", () => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [60, 52, 56, 60].map((height) => ({ color: "red", durationMs: 100, height })),
      },
    });

    expect(wrapper.findAll(".loop-dial__arc").map((path) => readArcs(path.attributes("d"))[0].radius))
      .toEqual([14.5, 7, 10.75, 14.5]);
  });

  it("keeps repeated single-pitch events at radius 7", () => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [100, 200, 300].map((durationMs) => ({ color: "red", durationMs, height: 55 })),
      },
    });

    expect(wrapper.findAll(".loop-dial__arc").map((path) => readArcs(path.attributes("d"))[0].radius))
      .toEqual([7, 7, 7]);
  });

  it("keeps invalid heights finite and at radius 7", () => {
    const wrapper = mount(LoopDial, {
      props: {
        segments: [NaN, Infinity, -Infinity].map((height) => ({ color: "red", durationMs: 100, height })),
      },
    });

    expect(wrapper.findAll(".loop-dial__arc").map((path) => readArcs(path.attributes("d"))[0].radius))
      .toEqual([7, 7, 7]);
  });

  it("draws a single event as one closed path containing two nondegenerate half circles", () => {
    const wrapper = mount(LoopDial, {
      props: { segments: [{ color: "red", durationMs: 100, height: 60 }] },
    });

    const paths = wrapper.findAll("path.loop-dial__arc");
    expect(paths).toHaveLength(1);
    const arcs = readArcs(paths[0].attributes("d"));
    expect(arcs).toHaveLength(2);
    expect(arcs[0].start).toEqual({ x: 17, y: 10 });
    expect(arcs[0].end).toEqual({ x: 17, y: 24 });
    expect(arcs[1].end).toEqual(arcs[0].start);
    arcs.forEach((arc) => {
      expect(arc.radius).toBe(7);
      expect(arc.sweep).toBe(1);
      expect(clockwiseTurns(arc)).toBeCloseTo(0.5, 3);
      expect(arc.end).not.toEqual(arc.start);
    });
  });

  it("renders an empty labelled root when there are no notes", () => {
    const wrapper = mount(LoopDial, {
      props: { segments: [], ariaLabel: "Current Take note timeline" },
    });

    expect(wrapper.findAll(".loop-dial__arc")).toHaveLength(0);
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("Current Take note timeline");
  });

  it("recomputes colors, durations, and pitch radii when segments are replaced", async () => {
    const wrapper = mount(LoopDial, {
      props: { segments: [{ color: "red", durationMs: 100, height: 55 }] },
    });
    const originalPath = wrapper.get(".loop-dial__arc").attributes("d");

    await wrapper.setProps({
      segments: [
        { color: "blue", durationMs: 100, height: 60 },
        { color: "green", durationMs: 300, height: 48 },
      ],
      ariaLabel: "Replaced note timeline",
    });

    const paths = wrapper.findAll(".loop-dial__arc");
    expect(paths).toHaveLength(2);
    expect(paths.map((path) => (path.element as SVGElement).style.stroke)).toEqual(["blue", "green"]);
    const arcs = paths.map((path) => readArcs(path.attributes("d"))[0]);
    expect(arcs.map((arc) => arc.radius)).toEqual([14.5, 7]);
    expect(clockwiseTurns(arcs[0])).toBeCloseTo(0.25 - 0.012, 3);
    expect(clockwiseTurns(arcs[1])).toBeCloseTo(0.75 - 0.012, 3);
    expect(paths[0].attributes("d")).not.toBe(originalPath);
    expect(wrapper.attributes("aria-label")).toBe("Replaced note timeline");

    await wrapper.setProps({ segments: [] });
    expect(wrapper.findAll(".loop-dial__arc")).toHaveLength(0);
    expect(wrapper.find(".loop-dial__start").exists()).toBe(true);
  });

  it("keeps the timeline still without SVG or CSS animation", () => {
    const wrapper = mount(LoopDial, {
      props: { segments: [{ color: "red", durationMs: 100, height: 55 }] },
    });

    expect(wrapper.find("animate, animateTransform, animateMotion").exists()).toBe(false);
    expect(loopDialSource).not.toMatch(/@keyframes|(?:animation|transition)(?:-[\w-]+)?\s*:/);
  });
});
