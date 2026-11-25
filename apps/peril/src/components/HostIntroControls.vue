<script setup lang="ts">
import type { GameState } from "@office-games/shared"
import { computed } from "vue"
import IconButton from "./IconButton.vue"

const props = defineProps<{ state: GameState }>()
defineEmits<{ next: []; start: [] }>()

const revealed = computed(() => props.state.intro?.revealed ?? 0)
const total = computed(() => props.state.categories.length)
const allRevealed = computed(() => revealed.value >= total.value)
/** The category the Viewers are looking at right now, if any. */
const showing = computed(() =>
  revealed.value > 0 ? (props.state.categories[revealed.value - 1] ?? null) : null,
)
</script>

<template>
  <section class="panel intro">
    <div class="current">
      <template v-if="showing">
        <span class="count">Category {{ revealed }} of {{ total }}</span>
        <span class="name">{{ showing.name }}</span>
        <span v-if="showing.hint" class="read">Read aloud: "{{ showing.hint }}"</span>
        <span v-else class="muted">No description. Just read the name.</span>
      </template>
      <span v-else class="muted">Reveal the first category to begin ({{ total }} in this round).</span>
    </div>
    <div class="buttons">
      <IconButton
        icon="next"
        :label="allRevealed ? 'All categories revealed' : 'Reveal next category'"
        :disabled="allRevealed"
        @click="$emit('next')"
      />
      <IconButton
        :icon="allRevealed ? 'play' : 'skip'"
        :label="allRevealed ? 'Start the round' : 'Skip to the board'"
        :active="allRevealed"
        tip-align="right"
        @click="$emit('start')"
      />
    </div>
  </section>
</template>

<style scoped>
.intro {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
}
.current {
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}
.count {
  font: 500 0.8rem var(--font-head);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #cdd6ff;
}
.name {
  font: 600 1.1rem var(--font-head);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gold);
}
.read {
  color: var(--gold-light);
}
.buttons {
  display: flex;
  gap: 0.5rem;
  flex: none;
}
</style>
