// Existing main/outer proportions and 44px row floor, shared with allocating hosts.
const MAIN_WEIGHT = 88 / 56;
export function minimumKeyboardHeight(rowCount: number) {
  return 44 * (Math.max(0, rowCount - 1) + MAIN_WEIGHT);
}
export function defaultKeyboardHeight(rowCount: number) {
  return 88 + 56 * Math.max(0, rowCount - 1);
}
export function fitKeyboardRows(height: number, rowCount: number) {
  const outer = Math.max(44, height / (Math.max(0, rowCount - 1) + MAIN_WEIGHT));
  return { main: outer * MAIN_WEIGHT, outer };
}
