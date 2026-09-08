const NUMERIC_DISPLAY = /^(\s*±?)([+-]?(?:\d+\.?\d*|\.\d+))(\s*[A-Za-z%°].*|\s*)$/;
const SCIENTIFIC_DISPLAY = /^\s*±?[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+/;

/**
 * Keep a formatter's semantic output while hiding floating-point noise.
 * This is display-only: interaction values, emitted values, and persistence
 * continue to use the full underlying number.
 */
export function formatKnobDisplayValue(value: string | number): string {
  const formatted = String(value);
  if (SCIENTIFIC_DISPLAY.test(formatted)) return formatted;

  const match = formatted.match(NUMERIC_DISPLAY);

  if (!match) return formatted;

  const numericValue = Number(match[2]);
  if (!Number.isFinite(numericValue)) return formatted;

  const explicitPlus = match[2].startsWith("+") ? "+" : "";
  const roundedValue = Number(numericValue.toFixed(2)).toString();
  return `${match[1]}${explicitPlus}${roundedValue}${match[3]}`;
}
