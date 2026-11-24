<script setup lang="ts">
import type { GameState } from "@office-games/shared"
import { computed } from "vue"

const props = defineProps<{ state: GameState }>()
const final = computed(() => props.state.final)
const nameOf = (id: string) => props.state.contestants.find((c) => c.id === id)?.name ?? "?"
const stageText = computed(() => {
  switch (final.value?.stage) {
    case "category":
      return "The category is"
    case "wagers":
      return "Place your wagers"
    case "clue":
      return "Write your response"
    default:
      return ""
  }
})
</script>

<template>
  <section v-if="final" class="final">
    <h2 class="wordmark">Final Peril!</h2>
    <p class="stage">{{ stageText }}</p>
    <p class="category">{{ final.category }}</p>
    <p v-if="final.clue" class="clue">{{ final.clue }}</p>
    <ul v-if="final.stage === 'reveal'" class="reveals">
      <li
        v-for="reveal in final.reveals"
        :key="reveal.contestantId"
        :class="{ right: reveal.correct === true, wrong: reveal.correct === false }"
      >
        <strong>{{ nameOf(reveal.contestantId) }}</strong>
        <template v-if="reveal.wager !== null">
          <span class="response">{{ reveal.response }}</span>
          <span class="wager">Wagered ${{ reveal.wager.toLocaleString("en-US") }}</span>
        </template>
        <span v-else class="pending">...</span>
      </li>
    </ul>
    <p v-if="final.correctResponse" class="correct">{{ final.correctResponse }}</p>
  </section>
</template>

<style scoped>
.final {
  text-align: center;
  background: radial-gradient(ellipse at center, var(--blue-bright), var(--blue) 55%, var(--blue-dark));
  border: 6px solid #000;
  border-radius: 10px;
  padding: 2rem 1.5rem;
  display: grid;
  gap: 1rem;
}
h2 {
  font-size: clamp(2rem, 6vw, 4.5rem);
  margin: 0;
}
.stage {
  margin: 0;
  font: 500 clamp(1rem, 2vw, 1.6rem) var(--font-head);
  text-transform: uppercase;
  color: #cdd6ff;
}
.category {
  margin: 0;
  font: 400 clamp(2rem, 5vw, 4rem) var(--font-value);
  color: var(--gold);
  text-shadow: 0.06em 0.06em 0 #000;
  text-transform: uppercase;
}
.clue {
  margin: 0 auto;
  max-width: 60ch;
  font: 700 clamp(1.2rem, 3vw, 2.4rem) / 1.4 var(--font-clue);
  text-transform: uppercase;
  text-shadow: 0.12em 0.12em 0 #000;
  text-wrap: balance;
}
.reveals {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  width: min(100%, 44rem);
  display: grid;
  gap: 0.6rem;
}
.reveals li {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 0.75rem;
  align-items: center;
  background: var(--blue-deep);
  border: 3px solid #000;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  text-align: left;
}
.reveals li.right {
  border-color: var(--green);
}
.reveals li.wrong {
  border-color: var(--red);
}
.response {
  font-family: var(--font-clue);
  text-transform: uppercase;
}
.wager {
  text-align: right;
  font: 400 1.2rem var(--font-value);
  color: var(--gold-light);
}
.correct {
  margin: 0;
  font: 700 clamp(1.2rem, 3vw, 2.2rem) var(--font-clue);
  text-transform: uppercase;
  color: var(--gold-light);
  text-shadow: 0.1em 0.1em 0 #000;
}
</style>
