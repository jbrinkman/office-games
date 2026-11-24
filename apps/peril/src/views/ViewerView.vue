<script setup lang="ts">
import { ROUND_NAMES, winners } from "@office-games/shared"
import { computed } from "vue"
import ClueDisplay from "../components/ClueDisplay.vue"
import FinalDisplay from "../components/FinalDisplay.vue"
import FinishedDisplay from "../components/FinishedDisplay.vue"
import GameBoard from "../components/GameBoard.vue"
import ScoreBar from "../components/ScoreBar.vue"
import { useViewerGame } from "../composables/useViewerGame.ts"
import { normalizeCode } from "../services/games.ts"

const props = defineProps<{ code: string }>()
const { status, state, message } = useViewerGame(normalizeCode(props.code))

const roundLabel = computed(() => {
  const index = state.value?.roundIndex ?? 0
  return index > 0 ? (ROUND_NAMES[index] ?? "") : ""
})
const current = computed(() => state.value?.current ?? null)
const currentCategory = computed(
  () => state.value?.categories[current.value?.categoryIndex ?? -1]?.name ?? "",
)

/** The Clue grows out of the cell it came from, as on the show. */
const zoomOrigin = computed(() => {
  const s = state.value
  const c = current.value
  if (!s || !c) return "50% 50%"
  const x = ((c.categoryIndex + 0.5) / Math.max(1, s.categories.length)) * 100
  const y = ((c.clueIndex + 1.6) / 6.15) * 100
  return `${x}% ${y}%`
})

const highlight = computed(() => (state.value?.phase === "finished" ? winners(state.value) : []))
</script>

<template>
  <main class="viewer">
    <p v-if="status === 'connecting'" class="center">Connecting to the game...</p>
    <div v-else-if="status === 'missing'" class="center">
      <h1 class="wordmark">Game not found</h1>
      <p class="muted">This game code does not exist, or the game has ended.</p>
      <RouterLink class="btn" to="/">Home</RouterLink>
    </div>
    <p v-else-if="status === 'error'" class="center error" role="alert">{{ message }}</p>

    <template v-else-if="state">
      <header>
        <span class="wordmark brand">Peril!</span>
        <span class="title">{{ state.title }}</span>
        <span v-if="state.phase === 'board' || state.phase === 'clue'" class="round">{{ roundLabel }}</span>
      </header>

      <section class="stage" :class="{ 'fit-board': state.phase === 'board' || state.phase === 'clue' }">
        <template v-if="state.phase === 'board' || state.phase === 'clue'">
          <GameBoard :key="state.roundIndex" :categories="state.categories" />
          <div
            v-if="current"
            :key="`${current.categoryIndex}-${current.clueIndex}`"
            class="clue-overlay"
            :style="{ transformOrigin: zoomOrigin }"
          >
            <ClueDisplay :current="current" :category-name="currentCategory" />
          </div>
        </template>
        <FinalDisplay v-else-if="state.phase === 'final'" :state="state" />
        <FinishedDisplay v-else :state="state" />
      </section>

      <footer>
        <ScoreBar
          :contestants="state.contestants"
          :active-id="state.activeContestantId"
          :highlight-ids="highlight"
        />
      </footer>
    </template>
  </main>
</template>

<style scoped>
.viewer {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem clamp(0.5rem, 3vw, 2rem) 1.5rem;
  max-width: 1500px;
  margin: 0 auto;
}
.center {
  margin: auto;
  text-align: center;
}
header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
.brand {
  font-size: 2rem;
}
.title {
  font: 500 1.2rem var(--font-head);
  text-transform: uppercase;
  color: #cdd6ff;
}
.round {
  margin-left: auto;
  font: 400 1.6rem var(--font-value);
  color: var(--gold);
  text-shadow: 0.06em 0.06em 0 #000;
  text-transform: uppercase;
}
.stage {
  position: relative;
}
/* Keep the whole board and the scores on one screen: the board is about 1.6 times wider than tall. */
.stage.fit-board {
  width: min(100%, calc((100vh - 15rem) * 1.6));
  margin-inline: auto;
}
.clue-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  animation: zoom-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes zoom-in {
  from {
    transform: scale(0.12);
    opacity: 0.4;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
