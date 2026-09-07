export type JoystickVisual = "analog" | "digital";

const STORAGE_KEY = "emotitone.joystick.visual";

let pageVisual: JoystickVisual = "analog";

export function nextJoystickVisual(previous: unknown): JoystickVisual {
  return previous === "analog" ? "digital" : "analog";
}

export function beginJoystickPageEdition(
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): JoystickVisual {
  try {
    pageVisual = nextJoystickVisual(storage.getItem(STORAGE_KEY));
    storage.setItem(STORAGE_KEY, pageVisual);
  } catch {
    pageVisual = "analog";
  }

  return pageVisual;
}

export function currentJoystickPageVisual(): JoystickVisual {
  return pageVisual;
}
