import { nextTick, type Ref } from "vue";
import type { TabItem, TabsSelectionSource } from "@/components/primatives/Tabs.vue";
import type { LabTabsProps } from "@/types/primitivesLab";

/**
 * Tablist semantics shared by the lab Tabs directions: roving tab stop,
 * automatic activation, and Arrow/Home/End navigation that skips disabled
 * tabs. Production Tabs' rail drag, wheel, and click suppression stay in
 * `Tabs.vue`; adoption would keep that code and swap only the skin.
 */
export function useLabTabs(
  props: LabTabsProps,
  emit: (event: "update:modelValue", value: string, source: TabsSelectionSource) => void,
  root: Ref<HTMLElement | null>,
) {
  const enabled = () => props.tabs.filter((tab) => !tab.disabled);

  const select = (tab: TabItem, source: TabsSelectionSource) => {
    if (tab.disabled || tab.value === props.modelValue) return;
    emit("update:modelValue", tab.value, source);
  };

  const focusValue = (value: string) => nextTick(() => {
    root.value?.querySelector<HTMLElement>(`[data-tab-value="${CSS.escape(value)}"]`)?.focus();
  });

  const onKeydown = (event: KeyboardEvent) => {
    const tabs = enabled();
    const index = tabs.findIndex((tab) => tab.value === props.modelValue);
    let next: TabItem | undefined;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") next = tabs[0];
    else if (event.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next, "keyboard");
    void focusValue(next.value);
  };

  const onClick = (tab: TabItem, event: MouseEvent) => select(tab, event.detail === 0 ? "keyboard" : "pointer");

  const label = (tab: TabItem) => (tab.value === props.modelValue ? tab.label : tab.shortLabel ?? tab.label);

  return { onKeydown, onClick, label };
}
