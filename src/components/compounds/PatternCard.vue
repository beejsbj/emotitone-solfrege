<template>
  <Card
    v-if="state === 'collapsed'"
    as="button"
    type="button"
    class="pattern-card pattern-card--collapsed"
    :label="label"
    :spine="spine"
    :aria-expanded="false"
    flush
    @click="emit('select')"
  >
    <template #mark><span class="pattern-card__ordinal">{{ ordinal }}</span></template>
    <div class="pattern-card__summary">
      <strong class="pattern-card__name">{{ name }}</strong>
      <span v-if="metadata" class="pattern-card__meta">{{ metadata }}</span>
    </div>
    <template #footer>
      <BarTape :segments="barTape" aria-label="Pattern note timeline" />
    </template>
  </Card>

  <Card
    v-else
    class="pattern-card pattern-card--expanded"
    :label="label"
    :spine="spine"
    flush
  >
    <template #mark><span class="pattern-card__ordinal">{{ ordinal }}</span></template>
    <div class="pattern-card__expanded-head">
      <strong class="pattern-card__name">{{ name }}</strong>
      <span v-if="metadata" class="pattern-card__meta">{{ metadata }}</span>
    </div>

    <CodeStrip
      class="pattern-card__code-strip"
      :tokens="codeTokens"
      :source="codeSource"
      density="dense"
      duration-mode="hidden"
      :framed="false"
      :show-chevron="false"
      aria-label="Expanded pattern Strudel code"
    />

    <div class="pattern-card__action-foot">
      <div class="pattern-card__actions" aria-label="Pattern actions">
        <Button
          size="sm"
          tone="ink"
          :disabled="!canDelete"
          :title="deleteLabel"
          :accessible-name="deleteLabel"
          @click.stop="emit('delete')"
        >
          <Check v-if="deleteArmed" aria-hidden="true" />
          <Trash2 v-else aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="ivory"
          :title="copied ? 'Copied' : 'Copy Strudel code'"
          :accessible-name="copied ? 'Copied' : 'Copy Strudel code'"
          @click.stop="emit('copy')"
        >
          <Check v-if="copied" aria-hidden="true" />
          <Copy v-else aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          tone="brass"
          title="Open in Strudel"
          accessible-name="Open in Strudel"
          @click.stop="emit('openStrudel')"
        >
          <ExternalLink aria-hidden="true" />
        </Button>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "../primatives/BarTape.vue";
import Button from "../primatives/Button.vue";
import Card from "../primatives/Card.vue";
import CodeStrip from "../uniques/CodeStrip/index.vue";
import type { BarTapeSegment } from "../primatives/BarTape.vue";
import type { CodeStripToken } from "../uniques/CodeStrip/index.vue";

export type PatternCardState = "collapsed" | "expanded";

const props = withDefaults(
  defineProps<{
    state?: PatternCardState;
    label: string;
    ordinal: string;
    name: string;
    metadata: string;
    spine?: string;
    barTape?: BarTapeSegment[];
    codeTokens?: CodeStripToken[];
    codeSource?: string;
    copied?: boolean;
    canDelete?: boolean;
    deleteArmed?: boolean;
  }>(),
  {
    state: "collapsed",
    spine: "var(--ivory)",
    barTape: () => [],
    codeTokens: undefined,
    codeSource: undefined,
    copied: false,
    canDelete: true,
    deleteArmed: false,
  },
);

const emit = defineEmits<{
  select: [];
  delete: [];
  openStrudel: [];
  copy: [];
}>();

const deleteLabel = computed(() => {
  if (!props.canDelete) return "Default patterns cannot be deleted";
  return props.deleteArmed ? "Confirm delete pattern" : "Delete pattern";
});
</script>

<style scoped>
.pattern-card {
  width: 100%;
}

.pattern-card--collapsed {
  color: inherit;
  cursor: pointer;
}

.pattern-card__ordinal {
  font: 400 42px/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.pattern-card__summary,
.pattern-card__expanded-head {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 22px 74px 12px 22px;
}

.pattern-card__summary {
  min-height: 58px;
  justify-content: center;
}

.pattern-card__expanded-head {
  min-height: 74px;
  justify-content: flex-end;
  padding-bottom: 16px;
}

.pattern-card__name {
  overflow: hidden;
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-card__meta {
  overflow: hidden;
  margin-top: 5px;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-card__code-strip {
  width: 100%;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}

.pattern-card__action-foot {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 14px 12px 22px;
}

.pattern-card__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}
</style>
