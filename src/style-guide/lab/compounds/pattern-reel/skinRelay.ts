/*
 * Guide-only DOM relays for the PatternReel lab skins. The real PatternStrip
 * stays mounted and keeps its button, aria-label, F2/double-tap rename and
 * actions; these relays only add aria-hidden paint beside its markup.
 *
 * - Ransom: each title gets a row of cut-letter scraps (the retired Ransom
 *   Sticker / CutHeadline rhythm) in Ink and Ivory, seeded from the title so a
 *   phrase always wears the same cut. The real <strong> stays in the DOM,
 *   visually hidden. Scraps that would run under the actions are dropped for a
 *   single ellipsis scrap.
 * - Spine: publishes each strip's label box (the identity button) as
 *   --ulab-label-x/-y/-w/-h so the skin can move the Bar Tape onto it.
 * Adoption would render these inside PatternStrip instead.
 */

const TILTS = [-4, 3, -1.5, 5, -3, 2, -5, 1, 4, -2.5];
const LIFTS = [0, -1, .5, -.5, 1, -1, .5, 1, -.5, 0];
const CUTS = [
  "polygon(4% 2%, 97% 0%, 100% 94%, 2% 100%)",
  "polygon(0% 6%, 100% 0%, 96% 100%, 5% 95%)",
  "polygon(3% 0%, 100% 4%, 98% 97%, 0% 100%)",
  "polygon(6% 3%, 94% 0%, 100% 100%, 0% 92%)",
  "polygon(0% 0%, 96% 5%, 100% 96%, 4% 100%)",
];

function seedOf(text: string) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function random(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function scrap(char: string, index: number, next: () => number, offset: number) {
  const element = document.createElement("span");
  element.className = "reel-ransom__scrap";
  element.textContent = char;
  const ivory = (index + offset) % 2 === 0;
  if (ivory) element.classList.add("reel-ransom__scrap--ivory");
  if (next() > .74) element.classList.add("reel-ransom__scrap--mono");
  element.style.setProperty("--scrap-tilt", `${TILTS[(index + offset) % TILTS.length]}deg`);
  element.style.setProperty("--scrap-lift", `${LIFTS[(index * 3 + offset) % LIFTS.length]}px`);
  element.style.setProperty("--scrap-size", next() > .55 ? "1" : ".84");
  element.style.setProperty("--scrap-cut", CUTS[(index + offset) % CUTS.length]);
  return element;
}

function renderRansom(title: HTMLElement) {
  const text = title.textContent?.trim() ?? "";
  const previous = title.previousElementSibling;
  const row = previous?.classList.contains("reel-ransom") ? previous as HTMLElement : document.createElement("span");
  if (row.dataset.text === text) return row;
  row.className = "reel-ransom";
  row.setAttribute("aria-hidden", "true");
  row.dataset.text = text;
  row.replaceChildren();
  const seed = seedOf(text);
  const next = random(seed);
  const offset = seed % 10;
  let visible = 0;
  for (const char of text) {
    if (char === " ") {
      const space = document.createElement("span");
      space.className = "reel-ransom__space";
      row.append(space);
    } else {
      row.append(scrap(char, visible++, next, offset));
    }
  }
  const ellipsis = scrap("…", visible, next, offset);
  ellipsis.classList.add("reel-ransom__ellipsis");
  row.append(ellipsis);
  if (row !== previous) title.before(row);
  return row;
}

/** Drop the scraps that would run past the row, ending on one ellipsis scrap. */
function fitRansom(row: HTMLElement) {
  const pieces = [...row.children] as HTMLElement[];
  const ellipsis = pieces.pop();
  if (!ellipsis) return;
  pieces.forEach((piece) => { piece.hidden = false; });
  ellipsis.hidden = true;
  const limit = row.clientWidth;
  if (!limit || row.scrollWidth <= limit + 1) return;
  ellipsis.hidden = false;
  const room = limit - ellipsis.offsetWidth - 2;
  const start = row.getBoundingClientRect().left;
  let cut = false;
  for (const piece of pieces) {
    if (cut || piece.getBoundingClientRect().right - start > room) {
      cut = true;
      piece.hidden = true;
    }
  }
  // Never end on a gap before the ellipsis.
  for (let index = pieces.length - 1; index >= 0; index--) {
    const piece = pieces[index];
    if (piece.hidden) continue;
    if (piece.classList.contains("reel-ransom__space")) piece.hidden = true;
    else break;
  }
}

function measureLabel(strip: HTMLElement) {
  const label = strip.querySelector<HTMLElement>(".pattern-strip__identity");
  if (!label) {
    strip.classList.remove("ulab-labelled");
    return;
  }
  // offsetLeft/offsetWidth ignore the reel's slot scale, so the box is exact.
  let left = 0;
  let top = 0;
  for (let node: HTMLElement | null = label; node && node !== strip; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  strip.style.setProperty("--ulab-label-x", `${left}px`);
  strip.style.setProperty("--ulab-label-y", `${top}px`);
  strip.style.setProperty("--ulab-label-w", `${label.offsetWidth}px`);
  strip.style.setProperty("--ulab-label-h", `${label.offsetHeight}px`);
  strip.classList.add("ulab-labelled");
}

export function attachSkinRelay(root: HTMLElement, skin: string | null | undefined) {
  if (skin !== "ransom" && skin !== "spine") return () => undefined;

  const resize = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target as HTMLElement;
      if (target.classList.contains("reel-ransom")) fitRansom(target);
      else if (target.classList.contains("pattern-strip")) measureLabel(target);
    }
  });
  const watched = new Set<Element>();
  function watch(element: Element) {
    if (watched.has(element)) return;
    watched.add(element);
    resize.observe(element);
  }

  function relay() {
    if (skin === "ransom") {
      root.querySelectorAll<HTMLElement>(".pattern-strip__identity strong").forEach((title) => {
        const row = renderRansom(title);
        fitRansom(row);
        watch(row);
      });
    } else {
      root.querySelectorAll<HTMLElement>(".pattern-strip").forEach((strip) => {
        measureLabel(strip);
        watch(strip);
      });
    }
    for (const element of watched) {
      if (!root.contains(element)) {
        resize.unobserve(element);
        watched.delete(element);
      }
    }
  }

  relay();
  const observer = new MutationObserver((records) => {
    // Ignore our own scrap writes.
    if (records.every((record) => (record.target as Element).closest?.(".reel-ransom"))) return;
    relay();
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  void document.fonts?.ready.then(relay);
  return () => {
    observer.disconnect();
    resize.disconnect();
    root.querySelectorAll(".reel-ransom").forEach((row) => row.remove());
  };
}
