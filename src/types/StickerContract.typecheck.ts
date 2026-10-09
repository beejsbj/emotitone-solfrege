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

const pinnedPaper: PublicStickerProps = {
  variant: "fill",
  color: "ivory",
  paper: "stamp",
};

const rejectedBadgePaper: PublicStickerProps = {
  variant: "badge",
  // @ts-expect-error Badge is brass hardware and never takes a paper treatment.
  paper: "tape",
};

void acceptedBadge;
void rejectedBadgeColor;
void pinnedPaper;
void rejectedBadgePaper;
