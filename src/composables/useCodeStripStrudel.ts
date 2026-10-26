import { computed, readonly, ref } from "vue";

/**
 * The text the Code Strip shows, shared with the shelf's Open in Strudel.
 * The strip has no playback of its own: Play is the loop, and only the
 * looper store starts or stops the transport (BJS-569).
 */
const currentCode = ref("");

export function hasPlayableContent(code: string): boolean {
  let index = 0;
  while (index < code.length) {
    if (/\s/.test(code[index] ?? "")) {
      index += 1;
      continue;
    }
    if (code.startsWith("//", index)) {
      const remainder = code.slice(index + 2);
      const lineBreak = remainder.search(/[\r\n  ]/);
      index = lineBreak < 0 ? code.length : index + lineBreak + 3;
      continue;
    }
    if (code.startsWith("/*", index)) {
      const closing = code.indexOf("*/", index + 2);
      index = closing < 0 ? code.length : closing + 2;
      continue;
    }
    return true;
  }
  return false;
}

export function useCodeStripStrudel() {
  return {
    /** The mounted strip publishes the code it shows. */
    syncCode(code: string) { currentCode.value = code; },
    /** The strip unmounted: nothing to open. */
    clearCode() { currentCode.value = ""; },
    currentCode: readonly(currentCode),
    hasPlayableCode: computed(() => hasPlayableContent(currentCode.value)),
  };
}
