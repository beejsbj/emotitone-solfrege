import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import brandLogoSource from "@/components/uniques/BrandLogo.vue?raw";
import { BRAND_BLOBS, BRAND_SCRAPS } from "@/components/uniques/brandMark";
import specimenSource from "@/style-guide/uniques/UniqueBrandLogo.vue?raw";

describe("BrandLogo", () => {
  it("renders the Count-In Cluster through one accessible identity seam", () => {
    const wrapper = mount(BrandLogo);

    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("EmotiTone");
    expect(wrapper.findAll(".brand-logo__backdrop")).toHaveLength(5);
    expect(wrapper.findAll(".brand-logo__beat")).toHaveLength(4);
    expect(wrapper.findAll(".brand-logo__scrap--e .brand-logo__glyph")).toHaveLength(4);
    expect(wrapper.findAll(".brand-logo__scrap--t .brand-logo__glyph")).toHaveLength(2);
    expect(wrapper.find(".brand-logo__wordmark").text()).toBe("EMOTITONE");
    expect(wrapper.find(".brand-logo__tab").text()).toBe("TONE");
  });

  it("keeps the OG five-circle silhouette: big Plum behind, Cobalt left, Mustard right, Tomato and Pine low", () => {
    const wrapper = mount(BrandLogo);
    const tones = wrapper.findAll(".brand-logo__backdrop").map((blob) => blob.attributes("data-tone"));
    expect(tones).toEqual(["plum", "cobalt", "mustard", "tomato", "pine"]);

    const [plum, cobalt, mustard, tomato, pine] = BRAND_BLOBS;
    expect(BRAND_BLOBS.slice(1).every((blob) => blob.r < plum.r)).toBe(true);
    expect(cobalt.x).toBeLessThan(plum.x);
    expect(mustard.x).toBeGreaterThan(plum.x);
    expect(Math.min(tomato.y, pine.y)).toBeGreaterThan(Math.max(cobalt.y, mustard.y));
    expect(tomato.x).toBeLessThan(pine.x);
  });

  it("layers circles, then beats, then the paste-up scraps with an Ink cut-edge", () => {
    const wrapper = mount(BrandLogo);
    const children = Array.from(wrapper.find(".brand-logo__svg").element.children);

    expect(children.slice(0, 5).every((element) => element.classList.contains("brand-logo__backdrop"))).toBe(true);
    expect(children[5].classList.contains("brand-logo__beats")).toBe(true);
    expect(children[6].classList.contains("brand-logo__scraps")).toBe(true);
    expect(children[7].classList.contains("brand-logo__sprinkles")).toBe(true);
    expect(wrapper.findAll(".brand-logo__sprinkle")).toHaveLength(7);
    expect(brandLogoSource).toMatch(/\.brand-logo__scrap--e \.brand-logo__paper \{ fill: var\(--ivory\); \}/);
    expect(brandLogoSource).toMatch(/\.brand-logo__scrap--t \.brand-logo__paper \{ fill: var\(--ink\); \}/);
    expect(BRAND_SCRAPS.map((scrap) => scrap.id)).toEqual(["e", "t"]);
    expect(brandLogoSource).toMatch(/\.brand-logo__paper\s*\{[^}]*stroke:\s*var\(--ink\)/s);
    expect(brandLogoSource).toMatch(/@container \(max-width: 72px\)\s*\{\s*\.brand-logo__beats \{ display: none; \}/s);
    expect(brandLogoSource).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("supports compact, mark-only, and Bone presentation without duplicating the source", () => {
    const compact = mount(BrandLogo, { props: { layout: "compact", size: 64 } });
    const mark = mount(BrandLogo, { props: { layout: "mark", surface: "bone" } });

    expect(compact.classes()).toContain("brand-logo--compact");
    expect(compact.attributes("style")).toContain("--brand-logo-mark-width: 64px");
    expect(mark.classes()).toContain("brand-logo--on-bone");
    expect(mark.find(".brand-logo__wordmark").exists()).toBe(false);
    expect(specimenSource.match(/<BrandLogo/g)).toHaveLength(8);
    expect(specimenSource).not.toContain("<polygon");
    expect(specimenSource).not.toContain("<circle");
  });
});
