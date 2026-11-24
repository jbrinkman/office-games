<script setup lang="ts">
import type { FinalEntries, GameState } from "@office-games/shared"
import { computed } from "vue"
import FinalDisplay from "./FinalDisplay.vue"

const props = defineProps<{ state: GameState; entries: FinalEntries; correctResponse: string }>()
const emit = defineEmits<{
  entries: [entries: FinalEntries]
  next: []
  reveal: [id: string]
  showCorrect: []
  judge: [id: string, correct: boolean]
  finish: []
}>()

const final = computed(() => props.state.final)
const reveals = computed(() => final.value?.reveals ?? [])
const nameOf = (id: string) => props.state.contestants.find((c) => c.id === id)?.name ?? "?"
const scoreOf = (id: string) => props.state.contestants.find((c) => c.id === id)?.score ?? 0

const nextLabel = computed(() => {
  switch (final.value?.stage) {
    case "category":
      return "Ask for wagers"
    case "wagers":
      return "Show the Clue"
    case "clue":
      return "Start revealing responses"
    default:
      return ""
  }
})

const allJudged = computed(() => reveals.value.every((r) => r.correct !== null))

function update(id: string, patch: Partial<{ wager: number; response: string }>) {
  const current = props.entries[id] ?? { wager: 0, response: "" }
  emit("entries", { ...props.entries, [id]: { ...current, ...patch } })
}
</script>

<template>
  <section v-if="final" class="stack">
    <FinalDisplay :state="state" />

    <div class="panel stack">
      <p class="private">
        <strong>For the Host only.</strong> Correct response: <span class="response">{{ correctResponse }}</span>
      </p>

      <template v-if="final.stage !== 'reveal'">
        <div v-if="final.stage !== 'category'" class="entries">
          <div v-for="r in reveals" :key="r.contestantId" class="entry">
            <strong>{{ nameOf(r.contestantId) }}</strong>
            <label>
              Wager (max ${{ scoreOf(r.contestantId) }})
              <input
                type="number"
                min="0"
                :max="scoreOf(r.contestantId)"
                step="1"
                :value="entries[r.contestantId]?.wager ?? 0"
                :disabled="final.stage !== 'wagers'"
                @input="update(r.contestantId, { wager: Number(($event.target as HTMLInputElement).value) })"
              />
            </label>
            <label>
              Response
              <input
                type="text"
                maxlength="200"
                :value="entries[r.contestantId]?.response ?? ''"
                @input="update(r.contestantId, { response: ($event.target as HTMLInputElement).value })"
              />
            </label>
          </div>
        </div>
        <div><button class="btn" type="button" @click="emit('next')">{{ nextLabel }}</button></div>
      </template>

      <template v-else>
        <ul class="judging">
          <li v-for="r in reveals" :key="r.contestantId" class="row">
            <strong>{{ nameOf(r.contestantId) }}</strong>
            <button
              v-if="r.wager === null"
              class="btn small"
              type="button"
              @click="emit('reveal', r.contestantId)"
            >
              Reveal
            </button>
            <template v-else-if="r.correct === null">
              <button class="btn small good" type="button" @click="emit('judge', r.contestantId, true)">
                Correct
              </button>
              <button class="btn small bad" type="button" @click="emit('judge', r.contestantId, false)">
                Wrong
              </button>
            </template>
            <span v-else :class="r.correct ? 'right' : 'wrong'">{{ r.correct ? "Correct" : "Wrong" }}</span>
          </li>
        </ul>
        <div class="row">
          <button
            class="btn secondary"
            type="button"
            :disabled="final.correctResponse !== null"
            @click="emit('showCorrect')"
          >
            Show correct response
          </button>
          <button class="btn" type="button" :disabled="!allJudged" @click="emit('finish')">Finish game</button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.private {
  border-left: 4px solid var(--gold);
  padding-left: 1rem;
  margin: 0;
}
.response {
  font: 700 1.2rem var(--font-clue);
  color: var(--gold-light);
}
.entries {
  display: grid;
  gap: 0.75rem;
}
.entry {
  display: grid;
  grid-template-columns: 8rem 12rem 1fr;
  gap: 0.75rem;
  align-items: end;
}
.entry label {
  font-weight: 400;
  font-size: 0.85rem;
}
.entry input {
  width: 100%;
}
.judging {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.judging strong {
  min-width: 8rem;
}
.right {
  color: var(--green);
}
.wrong {
  color: var(--red);
}
</style>
