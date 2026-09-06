import { shallowRef } from "vue";

// Production coordination is separate from the controlled, reusable Drawer surface.
// Instance identities also support the inactive sequencer's InstrumentSelector.
export const activeTopDrawer = shallowRef<symbol | null>(null);
