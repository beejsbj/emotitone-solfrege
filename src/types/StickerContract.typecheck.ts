import Sticker from "@/components/primatives/Sticker";

type PublicStickerProps = InstanceType<typeof Sticker>["$props"];

const acceptedBadge: PublicStickerProps = {
  variant: "badge",
  color: "ivory",
};

// @ts-expect-error Badge intentionally excludes ordinary Sticker paper colors.
const rejectedBadgeColor: PublicStickerProps = {
  variant: "badge",
  color: "tomato",
};

void acceptedBadge;
void rejectedBadgeColor;
