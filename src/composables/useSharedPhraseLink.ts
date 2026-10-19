import { ref, watch, type Ref } from "vue";
import { decodePhraseShare, phraseShareToken, type SharedPhrase } from "@/services/phraseShare";
import { usePhrasesStore } from "@/stores/phrases";

/** What the arrival notice says, while it shows. */
export const sharedPhraseNotice = ref<string | null>(null);
const NOTICE_MS = 5000;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function announce(message: string) {
  clearTimeout(noticeTimer);
  sharedPhraseNotice.value = message;
  noticeTimer = setTimeout(() => { sharedPhraseNotice.value = null; }, NOTICE_MS);
}

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
 * Open a phrase link (`#phrase=…`). Decoding starts at once; the phrase lands
 * on the desk once the app has started, so its instrument loads on a running
 * engine and the player's first tap of Play sounds it.
 */
export function useSharedPhraseLink(isLoading: Readonly<Ref<boolean>>) {
  const token = phraseShareToken(window.location.hash);
  if (!token) return;
  const phrases = usePhrasesStore();
  const decoded = decodePhraseShare(token);

  let received = false;
  const receive = async () => {
    if (received) return;
    received = true;
    const shared: SharedPhrase | null = await decoded;
    clearShareHash();
    if (!shared) {
      announce("That phrase link could not be opened");
      return;
    }
    phrases.receiveSharedPhrase(shared);
    announce(`${shared.name ?? "A shared phrase"} is on the desk. Press play.`);
  };

  watch(isLoading, (loading) => { if (!loading) void receive(); }, { immediate: true });
}
