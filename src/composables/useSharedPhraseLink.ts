import { onScopeDispose, ref, watch, type Ref } from "vue";
import { decodePhraseShare, phraseShareToken, type SharedPhrase } from "@/services/phraseShare";
import { usePhrasesStore } from "@/stores/phrases";
import { saveFailureNotice } from "@/services/safeStorage";

/** What the arrival notice says, while it shows. */
export const sharedPhraseNotice = ref<string | null>(null);
const NOTICE_MS = 5000;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleNoticeExpiry() {
  clearTimeout(noticeTimer);
  if (!sharedPhraseNotice.value || saveFailureNotice.value) return;
  noticeTimer = setTimeout(() => { sharedPhraseNotice.value = null; }, NOTICE_MS);
}

/** Every sharing result gets a fresh display period, after any save warning. */
export function announceSharedPhrase(message: string) {
  sharedPhraseNotice.value = message;
  scheduleNoticeExpiry();
}

// Both notices use the same compact slot. Keep a hidden share result until the
// save warning clears, then give it the full reading period.
watch(saveFailureNotice, scheduleNoticeExpiry, { flush: "sync" });

export function dismissSharedPhraseNotice() {
  clearTimeout(noticeTimer);
  sharedPhraseNotice.value = null;
}

/** Drop the phrase from the address so a reload does not open it twice. */
function clearShareHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", `${pathname}${search}`);
}

/**
 * Open a phrase link (`#phrase=…`), whether the app starts on it or it is
 * pasted into a tab that already has the app open (only the hash changes, so
 * the page does not reload). Decoding starts at once; the phrase lands on the
 * desk once the app has started, so its instrument loads on a running engine
 * and the player's first tap of Play sounds it.
 */
export function useSharedPhraseLink(isLoading: Readonly<Ref<boolean>>) {
  let generation = 0;
  let disposed = false;
  let pending: {
    decoded: Promise<SharedPhrase | null>;
    generation: number;
    hash: string;
  } | null = null;

  const receive = async () => {
    if (isLoading.value || !pending) return;
    const arrival = pending;
    pending = null;
    const shared = await arrival.decoded;
    if (disposed || arrival.generation !== generation || window.location.hash !== arrival.hash) return;
    clearShareHash();
    if (!shared) {
      announceSharedPhrase("That phrase link could not be opened");
      return;
    }
    usePhrasesStore().receiveSharedPhrase(shared);
    announceSharedPhrase(`${shared.name ?? "A shared phrase"} is on the desk. Press play.`);
  };

  const readHash = () => {
    generation += 1;
    pending = null;
    const hash = window.location.hash;
    const token = phraseShareToken(hash);
    if (!token) return;
    pending = { decoded: decodePhraseShare(token), generation, hash };
    void receive();
  };

  readHash();
  watch(isLoading, () => { void receive(); });
  window.addEventListener("hashchange", readHash);
  onScopeDispose(() => {
    disposed = true;
    pending = null;
    window.removeEventListener("hashchange", readHash);
  });
}
