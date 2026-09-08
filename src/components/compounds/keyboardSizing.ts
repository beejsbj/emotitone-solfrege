// Accepted main/outer hierarchy, shared by the keyboard and its allocating host.
const MAIN_ROW_HEIGHT = 76;
const OUTER_ROW_HEIGHT = 56;
const MAIN_WEIGHT = MAIN_ROW_HEIGHT / OUTER_ROW_HEIGHT;
const MIN_ROW_COUNT = 1;
const MAX_ROW_COUNT = 8;
export const KEYBOARD_CHORD_ROW_HEIGHT = 47;
export const MIN_KEYBOARD_OUTER_ROW_HEIGHT = 44;
export const MAX_KEYBOARD_OUTER_ROW_HEIGHT = 80;

function clampRowCount(rowCount: number) {
  return Math.max(MIN_ROW_COUNT, Math.min(MAX_ROW_COUNT, Math.round(rowCount)));
}

function rowWeight(rowCount: number) {
  return Math.max(0, clampRowCount(rowCount) - 1) + MAIN_WEIGHT;
}

export function minimumKeyboardHeight(rowCount: number) {
  return KEYBOARD_CHORD_ROW_HEIGHT
    + MIN_KEYBOARD_OUTER_ROW_HEIGHT * rowWeight(rowCount);
}
export function defaultKeyboardHeight(rowCount: number) {
  return KEYBOARD_CHORD_ROW_HEIGHT + OUTER_ROW_HEIGHT * rowWeight(rowCount);
}
export function maximumKeyboardHeight(rowCount: number) {
  return KEYBOARD_CHORD_ROW_HEIGHT
    + MAX_KEYBOARD_OUTER_ROW_HEIGHT * rowWeight(rowCount);
}
export function fitKeyboardRows(height: number, rowCount: number) {
  const outer = Math.max(
    MIN_KEYBOARD_OUTER_ROW_HEIGHT,
    Math.min(MAX_KEYBOARD_OUTER_ROW_HEIGHT, height / rowWeight(rowCount)),
  );
  return { main: outer * MAIN_WEIGHT, outer };
}

export function resolveKeyboardLayout(contentHeight: number, currentRowCount: number) {
  const melodyHeight = Math.max(0, contentHeight - KEYBOARD_CHORD_ROW_HEIGHT);
  let rowCount = clampRowCount(currentRowCount);
  let outerRowHeight = melodyHeight / rowWeight(rowCount);

  while (outerRowHeight > MAX_KEYBOARD_OUTER_ROW_HEIGHT && rowCount < MAX_ROW_COUNT) {
    rowCount += 1;
    outerRowHeight = melodyHeight / rowWeight(rowCount);
  }
  while (outerRowHeight < MIN_KEYBOARD_OUTER_ROW_HEIGHT && rowCount > MIN_ROW_COUNT) {
    rowCount -= 1;
    outerRowHeight = melodyHeight / rowWeight(rowCount);
  }

  outerRowHeight = Math.max(
    MIN_KEYBOARD_OUTER_ROW_HEIGHT,
    Math.min(MAX_KEYBOARD_OUTER_ROW_HEIGHT, outerRowHeight),
  );
  return {
    rowCount,
    outerRowHeight,
    mainRowHeight: outerRowHeight * MAIN_WEIGHT,
  };
}
