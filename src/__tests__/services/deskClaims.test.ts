import { describe, expect, it } from "vitest";
import { createDeskClaims } from "@/services/deskClaims";
import { fakeLocks } from "../helpers/fakeLocks";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("desk claims", () => {
  it("reports only takes no live tab holds, and lets go when the tab moves on or closes", async () => {
    const locks = fakeLocks();
    const b = createDeskClaims(locks);
    const c = createDeskClaims(locks);
    b.claim("take-b");
    await flush();
    expect(await c.unclaimed(["take-b", "take-gone"])).toEqual(["take-gone"]);
    b.claim("take-b2");
    await flush();
    expect(await c.unclaimed(["take-b", "take-b2"])).toEqual(["take-b"]);
    b.dispose();
    await flush();
    expect(await c.unclaimed(["take-b2"])).toEqual(["take-b2"]);
  });

  it("counts a take two tabs share as held while either is on it", async () => {
    const locks = fakeLocks();
    const a = createDeskClaims(locks);
    const b = createDeskClaims(locks);
    a.claim("shared");
    b.claim("shared");
    await flush();
    a.dispose();
    await flush();
    expect(await createDeskClaims(locks).unclaimed(["shared"])).toEqual([]);
  });

  it("reports nothing without the Web Locks API, so nothing is shelved by guesswork", async () => {
    expect(await createDeskClaims(undefined).unclaimed(["any"])).toEqual([]);
  });
});
