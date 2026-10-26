/**
 * The route-change step's log (BJS-494). Every observation is written into the
 * results as it is seen, not when Burooj answers, so a run stopped during the
 * step still summarises what the page already showed.
 */
import type { GateResults } from "./report";

export function createRouteLog(results: Pick<GateResults, "route">, now: () => number = () => performance.now()) {
  const started = now();
  const observations: string[] = [];
  const publish = (works: boolean | null) => { results.route = { works, observations: [...observations] }; };
  publish(null);
  return {
    observations,
    /** One thing the page saw, stamped with seconds into the step. */
    note(line: string) {
      observations.push(`${((now() - started) / 1000).toFixed(1)} s ${line}`);
      publish(results.route?.works ?? null);
    },
    /** Burooj's answer: kept playing, broke, or skipped (null). */
    answer(works: boolean | null) { publish(works); },
  };
}
