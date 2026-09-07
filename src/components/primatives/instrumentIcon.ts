import { Drum, Guitar, Piano, type LucideIcon } from "lucide-vue-next";
import { instrumentCatalog } from "@/data/instruments";
import type { InstrumentIconId } from "@/types/instrument";

const icons: Record<InstrumentIconId, LucideIcon> = {
  piano: Piano,
  guitar: Guitar,
  drum: Drum,
};

export function instrumentIconFor(instrument: string): LucideIcon | undefined {
  const icon = instrumentCatalog.describe(instrument).icon;
  return icon ? icons[icon] : undefined;
}
