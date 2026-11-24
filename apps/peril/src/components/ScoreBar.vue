<script setup lang="ts">
import type { Contestant } from "@office-games/shared"
import { nextTick, ref } from "vue"

const props = defineProps<{
  contestants: Contestant[]
  activeId: string | null
  /** Host mode: contestants can be clicked and scores edited. */
  interactive?: boolean
  highlightIds?: string[]
}>()
const emit = defineEmits<{ select: [id: string]; score: [id: string, score: number] }>()

const editingId = ref<string | null>(null)
const draft = ref("")

async function startEdit(contestant: Contestant) {
  editingId.value = contestant.id
  draft.value = String(contestant.score)
  await nextTick()
  document.getElementById(`score-edit-${contestant.id}`)?.focus()
}

function commit(contestant: Contestant) {
  const value = Number(draft.value)
  editingId.value = null
  if (Number.isInteger(value) && value !== contestant.score) emit("score", contestant.id, value)
}

function money(score: number): string {
  return `${score < 0 ? "-" : ""}$${Math.abs(score).toLocaleString("en-US")}`
}
</script>

<template>
  <ul class="scores" :style="{ '--count': props.contestants.length }">
    <li
      v-for="contestant in props.contestants"
      :key="contestant.id"
      class="contestant"
      :class="{
        active: contestant.id === props.activeId,
        winner: props.highlightIds?.includes(contestant.id),
      }"
    >
      <component
        :is="props.interactive ? 'button' : 'div'"
        class="name"
        :type="props.interactive ? 'button' : undefined"
        :aria-pressed="props.interactive ? contestant.id === props.activeId : undefined"
        :title="props.interactive ? 'Click to mark as the Active Contestant' : undefined"
        @click="props.interactive && emit('select', contestant.id)"
      >
        {{ contestant.name }}
      </component>
      <div class="score" :class="{ negative: contestant.score < 0 }">
        <input
          v-if="editingId === contestant.id"
          :id="`score-edit-${contestant.id}`"
          v-model="draft"
          class="score-edit"
          type="number"
          step="1"
          aria-label="New score"
          @keydown.enter.prevent="commit(contestant)"
          @keydown.esc.prevent="editingId = null"
          @blur="commit(contestant)"
        />
        <button
          v-else-if="props.interactive"
          type="button"
          class="score-button"
          title="Click to edit the score"
          @click="startEdit(contestant)"
        >
          {{ money(contestant.score) }}
        </button>
        <span v-else>{{ money(contestant.score) }}</span>
      </div>
      <slot name="actions" :contestant="contestant" />
    </li>
  </ul>
</template>

<style scoped>
.scores {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--count), minmax(0, 1fr));
  gap: 0.9rem;
}

.contestant {
  display: flex;
  flex-direction: column;
  border: 3px solid #000;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--blue-bright), var(--blue-dark));
  box-shadow: 0 4px 0 #000;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.contestant.active {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--gold), 0 0 24px 4px rgba(255, 216, 119, 0.6);
  transform: translateY(-4px);
}
.contestant.winner {
  border-color: var(--gold-light);
  box-shadow: 0 0 0 3px var(--gold-light), 0 0 30px 8px rgba(255, 216, 119, 0.8);
}

.name {
  appearance: none;
  border: 0;
  background: #000;
  color: var(--white);
  font: 600 clamp(0.9rem, 1.6vw, 1.4rem) var(--font-head);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  padding: 0.35rem 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
button.name {
  cursor: pointer;
}
button.name:hover {
  background: #1a1a1a;
}
.contestant.active .name {
  background: var(--gold);
  color: var(--ink);
}

.score {
  font: 400 clamp(1.6rem, 4vw, 3.4rem) / 1.2 var(--font-value);
  text-align: center;
  padding: 0.25rem 0.5rem;
  text-shadow: 0.06em 0.06em 0 #000;
}
.score.negative {
  color: var(--red);
}
.score-button {
  appearance: none;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-shadow: inherit;
  cursor: text;
  width: 100%;
}
.score-edit {
  width: 100%;
  text-align: center;
  font: 400 1.4rem var(--font-value);
  padding: 0.2rem;
}
</style>
