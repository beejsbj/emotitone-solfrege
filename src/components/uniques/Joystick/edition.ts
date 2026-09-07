export type JoystickVisual = "analog" | "digital";

const STORAGE_KEY = "emotitone.joystick.visual";

let pageVisual: JoystickVisual = "analog";

type JoystickEditionStorage = Pick<Storage, "getItem" | "setItem">;

export function nextJoystickVisual(
  previous: string | null | undefined,
): JoystickVisual {
  return previous === "analog" ? "digital" : "analog";
}

function browserStorage(): JoystickEditionStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function beginJoystickPageEdition(
  storage: JoystickEditionStorage | undefined = browserStorage(),
): JoystickVisual {
  let previous: string | null = null;

  try {
    previous = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    previous = null;
  }

  pageVisual = nextJoystickVisual(previous);

  try {
    storage?.setItem(STORAGE_KEY, pageVisual);
  } catch {
    // The selected treatment stays stable even when persistence is blocked.
  }

  return pageVisual;
}

export function currentJoystickPageVisual(): JoystickVisual {
  return pageVisual;
}
