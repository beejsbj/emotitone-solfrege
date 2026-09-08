// Existing main/outer proportions and 44px row floor, shared with allocating hosts.
const MAIN_WEIGHT = 88 / 56;
export const KEYBOARD_CHORD_ROW_HEIGHT = 47;
export function minimumKeyboardHeight(rowCount: number) {
  return KEYBOARD_CHORD_ROW_HEIGHT
    + 44 * (Math.max(0, rowCount - 1) + MAIN_WEIGHT);
}
export function defaultKeyboardHeight(rowCount: number) {
  return KEYBOARD_CHORD_ROW_HEIGHT + 88 + 56 * Math.max(0, rowCount - 1);
}
export function fitKeyboardRows(height: number, rowCount: number) {
  const outer = Math.max(44, height / (Math.max(0, rowCount - 1) + MAIN_WEIGHT));
  return { main: outer * MAIN_WEIGHT, outer };
}
