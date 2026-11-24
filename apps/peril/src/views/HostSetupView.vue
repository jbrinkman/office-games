<script setup lang="ts">
import {
  createGame,
  GameError,
  type Gamefile,
  MAX_CONTESTANTS,
  MIN_CONTESTANTS,
  parseGamefile,
} from "@office-games/shared"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import HostGate from "../components/HostGate.vue"
import { useAuth } from "../services/auth.ts"
import { createGameRecord, MAX_GAMEFILE_CHARS } from "../services/games.ts"

const router = useRouter()
const { user } = useAuth()

const bundled = ref<{ file: string; title: string }[]>([])
const gamefile = ref<Gamefile | null>(null)
const fileErrors = ref<string[]>([])
const names = ref<string[]>(["", "", ""])
const ttlHours = ref(6)
const creating = ref(false)
const createError = ref("")

onMounted(async () => {
  try {
    const response = await fetch("/games/index.json")
    bundled.value = ((await response.json()) as { games: { file: string; title: string }[] }).games
    if (bundled.value[0]) await loadBundled(bundled.value[0].file)
  } catch {
    bundled.value = []
  }
})

function accept(raw: string) {
  if (raw.length > MAX_GAMEFILE_CHARS) {
    gamefile.value = null
    fileErrors.value = ["That file is too large to host (over 200,000 characters)."]
    return
  }
  const result = parseGamefile(raw)
  gamefile.value = result.ok ? result.gamefile : null
  fileErrors.value = result.ok ? [] : result.errors
}

async function loadBundled(file: string) {
  const response = await fetch(`/games/${file}`)
  accept(await response.text())
}

async function onUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) accept(await file.text())
}

const summary = computed(() => {
  const g = gamefile.value
  if (!g) return ""
  const clues = g.rounds.reduce((n, r) => n + r.categories.length * 5, 0)
  const doubleDowns = g.rounds.reduce(
    (n, r) => n + r.categories.flatMap((c) => c.clues).filter((c) => c.doubleDown).length,
    0,
  )
  return `${g.rounds.length} round(s), ${clues} Clues, ${doubleDowns} Double Down(s)${g.final ? ", Final Peril" : ""}`
})

const filledNames = computed(() => names.value.map((n) => n.trim()).filter(Boolean))
const canCreate = computed(
  () =>
    gamefile.value !== null &&
    filledNames.value.length >= MIN_CONTESTANTS &&
    ttlHours.value >= 1 &&
    ttlHours.value <= 24 &&
    !creating.value,
)

function addName() {
  if (names.value.length < MAX_CONTESTANTS) names.value.push("")
}
function removeName(index: number) {
  if (names.value.length > MIN_CONTESTANTS) names.value.splice(index, 1)
}

async function create() {
  const file = gamefile.value
  const uid = user.value?.uid
  if (!file || !uid) return
  creating.value = true
  createError.value = ""
  try {
    const state = createGame(file, filledNames.value)
    const code = await createGameRecord(uid, file, state, Math.round(ttlHours.value))
    await router.push(`/host/${code}`)
  } catch (error) {
    createError.value =
      error instanceof GameError
        ? error.message
        : "Could not create the game. Check your connection and try again."
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <HostGate title="New game">
  <main class="page stack">
    <h1 class="wordmark">New game</h1>

    <form class="stack" @submit.prevent="create">
      <section class="panel stack">
        <h2>1. Choose a Gamefile</h2>
        <div v-if="bundled.length">
          <label for="bundled">Bundled games</label>
          <select id="bundled" @change="loadBundled(($event.target as HTMLSelectElement).value)">
            <option v-for="g in bundled" :key="g.file" :value="g.file">{{ g.title }}</option>
          </select>
        </div>
        <div>
          <label for="upload">Or upload your own (.json)</label>
          <input id="upload" type="file" accept="application/json,.json" @change="onUpload" />
        </div>
        <p v-if="gamefile" class="muted">
          <strong>{{ gamefile.title }}</strong>: {{ summary }}
        </p>
        <ul v-if="fileErrors.length" class="error" role="alert">
          <li v-for="e in fileErrors.slice(0, 8)" :key="e">{{ e }}</li>
        </ul>
      </section>

      <section class="panel stack">
        <h2>2. Add Contestants</h2>
        <div v-for="(_, i) in names" :key="i" class="row">
          <label class="sr-only" :for="`name-${i}`">Contestant {{ i + 1 }}</label>
          <input
            :id="`name-${i}`"
            v-model="names[i]"
            :placeholder="`Contestant ${i + 1}`"
            maxlength="30"
            autocomplete="off"
          />
          <button
            v-if="names.length > MIN_CONTESTANTS"
            class="btn secondary small"
            type="button"
            @click="removeName(i)"
          >
            Remove
          </button>
        </div>
        <div>
          <button
            class="btn secondary small"
            type="button"
            :disabled="names.length >= MAX_CONTESTANTS"
            @click="addName"
          >
            Add Contestant
          </button>
        </div>
        <p class="muted">{{ MIN_CONTESTANTS }} to {{ MAX_CONTESTANTS }} Contestants.</p>
      </section>

      <section class="panel stack">
        <h2>3. Game length</h2>
        <label for="ttl">Hours the game stays open after your last action (1 to 24)</label>
        <input id="ttl" v-model.number="ttlHours" type="number" min="1" max="24" step="1" />
      </section>

      <p v-if="createError" class="error" role="alert">{{ createError }}</p>
      <div class="row">
        <button class="btn" type="submit" :disabled="!canCreate">
          {{ creating ? "Creating..." : "Create game" }}
        </button>
        <RouterLink class="btn secondary" to="/">Cancel</RouterLink>
      </div>
    </form>
  </main>
  </HostGate>
</template>
