import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Card from "@/components/primatives/Card.vue";
import cardSource from "@/components/primatives/Card.vue?raw";
import patternCardSource from "@/components/compounds/PatternCard.vue?raw";
import specimenSource from "@/style-guide/primatives/PrimitiveCard.vue?raw";

describe("Card", () => {
  it("renders the accepted shell with an Ivory spine by default", () => {
    const wrapper = mount(Card, {
      props: { label: "01 — Stage / Ivory" },
      slots: {
        default: '<h3 data-testid="content">A dark room</h3>',
        mark: '<span data-testid="mark">01</span>',
      },
    });

    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.find(".system-card__label").text()).toBe("01 — Stage / Ivory");
    expect(wrapper.find(".system-card__spine").exists()).toBe(true);
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mark"]').exists()).toBe(true);
    expect(wrapper.attributes("style")).toContain("--card-spine: var(--ivory)");
  });

  it("treats spine color as a plain Card override", () => {
    const wrapper = mount(Card, {
      props: {
        as: "button",
        label: "01 — Preset / Tomato",
        spine: "var(--tomato)",
        flush: true,
      },
      attrs: { type: "button" },
      slots: { default: "Warm-up" },
    });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.classes()).toContain("system-card--flush");
    expect(wrapper.attributes("style")).toContain("--card-spine: var(--tomato)");
    expect(wrapper.find(".system-card__label").text()).toBe("01 — Preset / Tomato");
    expect(cardSource).toMatch(/button\.system-card\s*{[^}]*appearance: none;[^}]*padding: 0;/s);
  });

  it("keeps the spine above opaque footer content", () => {
    const wrapper = mount(Card, {
      props: { label: "Pattern 01" },
      slots: {
        default: "Pattern",
        footer: '<span data-testid="footer">timeline</span>',
      },
    });

    expect(wrapper.find('[data-testid="footer"]').exists()).toBe(true);
    expect(cardSource).toMatch(/\.system-card__spine\s*{[^}]*z-index: 3;/s);
  });

  it("has one source and no named Spine Card variant", () => {
    expect(cardSource).toContain('spine: "var(--ivory)"');
    expect(cardSource).not.toMatch(/SpineCard|CardShell|compact|borderless|inversion/);
    expect(specimenSource).toContain(
      'import Card from "../../components/primatives/Card.vue"',
    );
    expect(specimenSource).not.toMatch(/CardShell|SpineCard/);
    expect(patternCardSource).toContain('import Card from "../primatives/Card.vue"');
  });
});
