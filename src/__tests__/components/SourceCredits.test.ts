import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SourceCredits from "@/components/uniques/SourceCredits.vue";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";
import { sourceUrl } from "@/utils/sourceLink";

const REPO = "https://github.com/beejsbj/emotitone-solfrege";
const SHA = "0106f97e4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";

describe("Source & Credits link", () => {
  it("points at the deployed commit when the build recorded one", () => {
    const link = mount(SourceCredits, { props: { commit: SHA } }).get("a");
    expect(link.text()).toBe("Source & Credits");
    expect(link.attributes("href")).toBe(`${REPO}/tree/${SHA}`);
    expect(link.attributes("rel")).toContain("noopener");
  });

  it("falls back to the main tree when there is no commit", () => {
    expect(mount(SourceCredits).get("a").attributes("href")).toBe(`${REPO}/tree/main`);
    expect(mount(SourceCredits, { props: { commit: "" } }).get("a").attributes("href"))
      .toBe(`${REPO}/tree/main`);
  });

  it("never builds a link from something that is not a commit hash", () => {
    expect(sourceUrl("../../evil?x=1")).toBe(`${REPO}/tree/main`);
  });

  it("is offered on the loading screen, the brand zone", () => {
    const link = mount(LoadingScreen, { props: { mode: "app" } }).find("a.source-credits");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toMatch(new RegExp(`^${REPO}/tree/`));
  });
});
