import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import brandLogoSource from "@/components/uniques/BrandLogo.vue?raw";
import specimenSource from "@/style-guide/uniques/UniqueBrandLogo.vue?raw";

describe("BrandLogo", () => {
  it("renders the approved centered cluster through one accessible identity seam", () => {
    const wrapper = mount(BrandLogo);

    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("EmotiTone");
    expect(wrapper.findAll(".brand-logo__backdrop")).toHaveLength(5);
    expect(wrapper.findAll(".brand-logo__cut--e")).toHaveLength(4);
    expect(wrapper.findAll(".brand-logo__cut--t")).toHaveLength(2);
    expect(wrapper.findAll(".brand-logo__sprinkle")).toHaveLength(9);
    expect(wrapper.find(".brand-logo__wordmark").text()).toBe("EMOTITONE");
  });

  it("composes every scattered glyph from the authoritative Mark primitive", () => {
    const wrapper = mount(BrandLogo);
    const marks = wrapper.findAll("[data-mark]");

    expect(marks.map((mark) => mark.attributes("data-mark"))).toEqual([
      "wave",
      "eighth",
      "staccato",
      "diamond",
      "grace",
      "triangle",
      "star",
      "whole",
      "sharp",
    ]);
    expect(brandLogoSource).toContain('import Mark from "../primatives/Mark.vue"');
  });

  it("keeps the approved layer order and smooth-circle construction", () => {
    const wrapper = mount(BrandLogo);
    const mark = wrapper.find(".brand-logo__mark");
    const children = Array.from(mark.element.children);

    expect(children.slice(0, 5).every((element) => element.classList.contains("brand-logo__backdrop"))).toBe(true);
    expect(children[5].classList.contains("brand-logo__monogram")).toBe(true);
    expect(children.slice(6).every((element) => element.classList.contains("brand-logo__sprinkle"))).toBe(true);
    expect(brandLogoSource).toMatch(/\.brand-logo__backdrop\s*\{[^}]*z-index:\s*0/s);
    expect(brandLogoSource).toMatch(/\.brand-logo__monogram\s*\{[^}]*z-index:\s*1/s);
    expect(brandLogoSource).toMatch(/\.brand-logo__sprinkle\s*\{[^}]*z-index:\s*2/s);
    expect(brandLogoSource).toMatch(/\.brand-logo__backdrop\s*\{[^}]*border-radius:\s*50%/s);
  });

  it("supports compact, mark-only, and Bone presentation without duplicating the source", () => {
    const compact = mount(BrandLogo, { props: { layout: "compact", size: 64 } });
    const mark = mount(BrandLogo, { props: { layout: "mark", surface: "bone" } });

    expect(compact.classes()).toContain("brand-logo--compact");
    expect(compact.attributes("style")).toContain("--brand-logo-mark-width: 64px");
    expect(mark.classes()).toContain("brand-logo--on-bone");
    expect(mark.find(".brand-logo__wordmark").exists()).toBe(false);
    expect(specimenSource.match(/<BrandLogo/g)).toHaveLength(5);
    expect(specimenSource).not.toContain("<polygon");
    expect(specimenSource).not.toContain("<Mark");
  });
});
