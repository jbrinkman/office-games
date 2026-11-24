<script setup lang="ts">
import { type GameState, maxDoubleDownWager } from "@office-games/shared"
import { computed, ref } from "vue"

const props = defineProps<{ state: GameState; response: string; clueText: string }>()
const emit = defineEmits<{
  wager: [amount: number, override: boolean]
  reveal: []
  close: []
}>()

const current = computed(() => props.state.current)
const wager = ref(0)
const override = ref(false)
const max = computed(() => maxDoubleDownWager(props.state))
const needsWager = computed(
  () => current.value?.doubleDown === true && current.value.wager === null,
)
const activeName = computed(
  () => props.state.contestants.find((c) => c.id === props.state.activeContestantId)?.name,
)
</script>

<template>
  <section v-if="current" class="panel stack">
    <div class="private">
      <strong>For the Host only</strong>
      <p v-if="needsWager" class="clue-text">{{ clueText }}</p>
      <p class="response">{{ response }}</p>
    </div>

    <form v-if="needsWager" class="stack" @submit.prevent="emit('wager', Math.round(wager), override)">
      <p v-if="!activeName" class="error">Click a Contestant's name to choose who is wagering.</p>
      <p v-else>
        <strong>{{ activeName }}</strong> wagers (up to ${{ max.toLocaleString("en-US") }}):
      </p>
      <div class="row">
        <label class="sr-only" for="wager">Wager</label>
        <input id="wager" v-model.number="wager" type="number" min="0" step="1" />
        <label class="inline">
          <input v-model="override" type="checkbox" /> Allow more than the limit
        </label>
        <button class="btn" type="submit" :disabled="!activeName">Show Clue</button>
      </div>
    </form>

    <div class="row">
      <button
        class="btn secondary"
        type="button"
        :disabled="current.responseRevealed || needsWager"
        @click="emit('reveal')"
      >
        Reveal response
      </button>
      <button class="btn" type="button" @click="emit('close')">Back to board</button>
      <span class="muted">Mark each Contestant correct or wrong below their score.</span>
    </div>
  </section>
</template>

<style scoped>
.private {
  border-left: 4px solid var(--gold);
  padding-left: 1rem;
}
.private p {
  margin: 0.3rem 0 0;
}
.response {
  font: 700 1.4rem var(--font-clue);
  color: var(--gold-light);
}
.clue-text {
  color: #cdd6ff;
}
.inline {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  font-weight: 400;
  margin: 0;
}
.inline input {
  padding: 0;
}
</style>
