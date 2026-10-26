import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import SharedPhraseNotice from "@/components/ui/SharedPhraseNotice.vue";
import SaveFailureNotice from "@/components/ui/SaveFailureNotice.vue";
import {
  announceSharedPhrase,
  dismissSharedPhraseNotice,
  sharedPhraseNotice,
} from "@/composables/useSharedPhraseLink";
import { dismissSaveFailure, reportSaveFailure, resetSaveFailure } from "@/services/safeStorage";

describe("sharing result notices", () => {
  let shared: ReturnType<typeof mount>;
  let save: ReturnType<typeof mount>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSaveFailure();
    dismissSharedPhraseNotice();
    shared = mount(SharedPhraseNotice);
    save = mount(SaveFailureNotice);
  });

  afterEach(() => {
    shared.unmount();
    save.unmount();
    dismissSharedPhraseNotice();
    resetSaveFailure();
    vi.useRealTimers();
  });

  it("gives a replacement sharing failure its own five seconds", async () => {
    announceSharedPhrase("A shared phrase is on the desk. Press play.");
    vi.advanceTimersByTime(4500);
    announceSharedPhrase("This phrase could not be shared as a link. It may be too large.");
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(shared.text()).toContain("could not be shared");
    vi.advanceTimersByTime(4499);
    expect(sharedPhraseNotice.value).toContain("could not be shared");
    vi.advanceTimersByTime(1);
    await nextTick();
    expect(shared.find('[role="status"]').exists()).toBe(false);
  });

  it.each([true, false])("holds the share result behind a save warning that arrives first: %s", async (saveFirst) => {
    if (saveFirst) reportSaveFailure("quota", "notice-test");
    announceSharedPhrase("A shared phrase is on the desk. Press play.");
    if (!saveFirst) {
      vi.advanceTimersByTime(4500);
      reportSaveFailure("quota", "notice-test");
    }
    await nextTick();
    expect(save.find('[role="alert"]').exists()).toBe(true);
    expect(shared.find('[role="status"]').exists()).toBe(false);
    vi.advanceTimersByTime(10000);
    expect(sharedPhraseNotice.value).toContain("on the desk");
    dismissSaveFailure();
    await nextTick();
    expect(save.find('[role="alert"]').exists()).toBe(false);
    expect(shared.text()).toContain("on the desk");
    vi.advanceTimersByTime(4999);
    expect(sharedPhraseNotice.value).toContain("on the desk");
    vi.advanceTimersByTime(1);
    expect(sharedPhraseNotice.value).toBeNull();
  });
});
