import type { DefineComponent } from "vue";
import StickerSource from "./Sticker.vue";
import type { StickerProps } from "./Sticker.vue";

type PaperStickerProps = Exclude<StickerProps, { variant: "badge" }>;
type BadgeStickerProps = Extract<StickerProps, { variant: "badge" }>;
type PublicStickerComponent =
  | DefineComponent<PaperStickerProps>
  | DefineComponent<BadgeStickerProps>;

/**
 * Public Sticker component contract.
 *
 * Vue flattens union-based `defineProps` declarations when exposing an SFC to
 * template callers. Preserve the discriminated Sticker/Badge contract at the
 * import boundary while keeping the SFC as the sole runtime implementation.
 */
const Sticker = StickerSource as unknown as PublicStickerComponent;

export default Sticker;
export type {
  BadgeColor,
  StickerColor,
  StickerMarkPosition,
  StickerPaperColor,
  StickerPaperVariant,
  StickerProps,
  StickerVariant,
} from "./Sticker.vue";
