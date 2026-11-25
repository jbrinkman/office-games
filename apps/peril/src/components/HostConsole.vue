<script setup lang="ts">
import { ROUND_NAMES, winners } from "@office-games/shared"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useHostGame } from "../composables/useHostGame.ts"
import ClueDisplay from "./ClueDisplay.vue"
import FinishedDisplay from "./FinishedDisplay.vue"
import GameBoard from "./GameBoard.vue"
import HostClueControls from "./HostClueControls.vue"
import HostFinalControls from "./HostFinalControls.vue"
import HostIntroControls from "./HostIntroControls.vue"
import IconButton from "./IconButton.vue"
import ScoreBar from "./ScoreBar.vue"

const props = defineProps<{ code: string; hostUid: string }>()
const router = useRouter()
const game = useHostGame(props.code, props.hostUid)
const { state, gamefile, status, notice } = game
const copiedWhat = ref<"code" | "link" | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => game.load())

const viewerUrl = computed(() => `${window.location.origin}/g/${props.code}`)
const roundName = computed(() => ROUND_NAMES[state.value?.roundIndex ?? 0] ?? "")

const timeLeft = computed(() => {
  const minutes = Math.ceil(game.msLeft.value / 60000)
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
})

const advanceLabel = computed(() => {
  const s = state.value
  if (!s) return ""
  if (s.roundIndex + 1 < s.roundCount) return `Start ${ROUND_NAMES[s.roundIndex + 1]}`
  return s.hasFinal ? "Start Final Peril!" : "Finish game"
})

const boardCleared = computed(
  () => state.value?.categories.every((c) => c.cells.every((cell) => cell.used)) ?? false,
)

const clueContext = computed(() => {
  const s = state.value
  const f = gamefile.value
  const c = s?.current
  if (!s || !f || !c) return null
  const clue = f.rounds[s.roundIndex]?.categories[c.categoryIndex]?.clues[c.clueIndex]
  return { clue, categoryName: s.categories[c.categoryIndex]?.name ?? "" }
})

async function copy(what: "code" | "link") {
  try {
    await navigator.clipboard.writeText(what === "code" ? props.code : viewerUrl.value)
    copiedWhat.value = what
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copiedWhat.value = null
    }, 2000)
  } catch {
    game.notice.value = "Could not copy automatically. Select the text and copy it instead."
  }
}

function advance() {
  if (!boardCleared.value && !window.confirm("Some Clues have not been played. Move on anyway?"))
    return
  game.advance()
}

async function endGame() {
  if (!window.confirm("End this game and delete it? Viewers will lose access.")) return
  await game.endGame()
  await router.push("/")
}

function judged(id: string): "correct" | "incorrect" | undefined {
  return state.value?.current?.judged.find((j) => j.contestantId === id)?.result
}

function canJudge(id: string): boolean {
  const c = state.value?.current
  if (!c || c.clue === null || c.resolved || judged(id)) return false
  return !c.doubleDown || id === state.value?.activeContestantId
}
</script>

<template>
  <main class="page stack console">
    <p v-if="status === 'loading'">Loading your game...</p>
    <div v-else-if="status === 'missing'" class="stack">
      <h1 class="wordmark">Game not found</h1>
      <p class="muted">
        This game does not exist, has expired, or belongs to a different Google account.
      </p>
      <RouterLink class="btn" to="/">Home</RouterLink>
    </div>

    <template v-else-if="state && gamefile">
      <header class="top">
        <div>
          <span class="wordmark brand">Peril!</span>
          <span class="muted title"> {{ state.title }}</span>
        </div>
        <div class="row">
          <span v-if="['intro', 'board', 'clue'].includes(state.phase)" class="round">{{ roundName }}</span>
          <span class="muted" title="Time until the game closes. Each action resets it.">
            Closes in {{ timeLeft }}
          </span>
        </div>
      </header>

      <section class="panel share">
        <label class="share-label" for="game-url">Game URL</label>
        <input
          id="game-url"
          class="share-url"
          type="text"
          readonly
          :value="viewerUrl"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <IconButton
          :icon="copiedWhat === 'link' ? 'check' : 'copy'"
          :label="copiedWhat === 'link' ? 'Copied' : 'Copy URL'"
          :active="copiedWhat === 'link'"
          @click="copy('link')"
        />
        <IconButton
          :icon="copiedWhat === 'code' ? 'check' : 'hash'"
          :label="copiedWhat === 'code' ? 'Copied' : `Copy code (${props.code})`"
          :active="copiedWhat === 'code'"
          @click="copy('code')"
        />
        <IconButton icon="open" label="Open board" :href="viewerUrl" />
        <span class="spacer" />
        <IconButton
          icon="undo"
          label="Undo"
          :disabled="!game.canUndo.value"
          @click="game.undo()"
        />
        <IconButton icon="trash" label="End game" tip-align="right" @click="endGame" />
        <span class="sr-only" role="status">
          {{ copiedWhat === "code" ? "Game code copied" : copiedWhat === "link" ? "Game URL copied" : "" }}
        </span>
      </section>

      <p v-if="notice" class="error" role="alert">{{ notice }}</p>

      <section v-if="state.phase === 'intro' || state.phase === 'board'" class="stack">
        <GameBoard
          :key="state.roundIndex"
          :categories="state.categories"
          :clickable="state.phase === 'board'"
          :intro-revealed="state.phase === 'intro' ? (state.intro?.revealed ?? 0) : null"
          @select="game.selectClue"
        />
        <HostIntroControls
          v-if="state.phase === 'intro'"
          :state="state"
          @next="game.revealNextCategory()"
          @start="game.startRound()"
        />
        <div v-else class="row">
          <button class="btn" type="button" @click="advance">{{ advanceLabel }}</button>
          <span class="muted">Click a Clue to play it. Click a Contestant's name to mark who is in control.</span>
        </div>
      </section>

      <section v-else-if="state.phase === 'clue' && state.current && clueContext" class="stack">
        <div class="clue-wrap">
          <ClueDisplay :current="state.current" :category-name="clueContext.categoryName" />
        </div>
        <HostClueControls
          :state="state"
          :response="clueContext.clue?.response ?? ''"
          :clue-text="clueContext.clue?.clue ?? ''"
          @wager="game.setWager"
          @reveal="game.revealResponse()"
          @close="game.closeClue()"
        />
      </section>

      <HostFinalControls
        v-else-if="state.phase === 'final'"
        :state="state"
        :entries="game.entries.value"
        :correct-response="gamefile.final?.response ?? ''"
        @entries="game.setEntries"
        @next="game.finalNext()"
        @reveal="game.finalReveal"
        @show-correct="game.finalShowCorrect()"
        @judge="game.finalJudge"
        @finish="game.finish()"
      />

      <FinishedDisplay v-else :state="state" />

      <div>
      <ScoreBar
        :contestants="state.contestants"
        :active-id="state.activeContestantId"
        :highlight-ids="state.phase === 'finished' ? winners(state) : []"
        interactive
        @select="(id) => game.setActive(id === state?.activeContestantId ? null : id)"
        @score="game.setScore"
      >
        <template #actions="{ contestant }">
          <div v-if="state.phase === 'clue' && state.current" class="judge">
            <template v-if="judged(contestant.id)">
              <span :class="judged(contestant.id)">{{ judged(contestant.id) }}</span>
            </template>
            <template v-else>
              <button
                class="btn small good"
                type="button"
                :disabled="!canJudge(contestant.id)"
                @click="game.judge(contestant.id, 'correct')"
              >
                Correct
              </button>
              <button
                class="btn small bad"
                type="button"
                :disabled="!canJudge(contestant.id)"
                @click="game.judge(contestant.id, 'incorrect')"
              >
                Wrong
              </button>
            </template>
          </div>
        </template>
      </ScoreBar>
      </div>
    </template>
  </main>
</template>

<style scoped>
.console {
  max-width: 1200px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.brand {
  font-size: 2rem;
  margin-right: 0.75rem;
}
.round {
  font: 400 1.4rem var(--font-value);
  color: var(--gold);
  text-transform: uppercase;
}
.share {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
}
.share-label {
  margin: 0;
  font-weight: 600;
  white-space: nowrap;
}
.share-url {
  flex: 0 1 30rem;
  min-width: 10rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  user-select: all;
}
.spacer {
  flex: 1 1 0;
}
.clue-wrap {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.judge {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  padding: 0.4rem;
  background: #000;
}
.judge span {
  font: 600 0.9rem var(--font-head);
  text-transform: uppercase;
}
.judge .correct {
  color: var(--green);
}
.judge .incorrect {
  color: var(--red);
}
</style>
