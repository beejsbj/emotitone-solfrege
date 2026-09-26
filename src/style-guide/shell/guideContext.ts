import { inject, type InjectionKey } from "vue";
import type { GuideUnitDensity } from "@/types/styleGuide";

/** How much anatomy a unit's frame shows; supplied by the layer page. */
export const GUIDE_UNIT_DENSITY: InjectionKey<GuideUnitDensity> = Symbol("guide-unit-density");

export const useGuideUnitDensity = () => inject(GUIDE_UNIT_DENSITY, "detailed");
