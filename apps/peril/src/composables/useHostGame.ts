import {
  adjustScore,
  advanceFinalStage,
  advanceFromBoard,
  closeClue,
  type FinalEntries,
  finalEntriesSchema,
  finishGame,
  GameError,
  type Gamefile,
  type GameState,
  judgeFinal,
  judgeResponse,
  parseGamefile,
  revealFinalCorrectResponse,
  revealFinalEntry,
  revealResponse,
  selectClue,
  setActiveContestant,
  setDoubleDownWager,
} from "@office-games/shared"
import { computed, onScopeDispose, ref, shallowRef } from "vue"
import { serverNow } from "../services/firebase.ts"
import {
  deleteGame,
  extendExpiry,
  loadHostGame,
  writeFinalEntries,
  writeState,
} from "../services/games.ts"

const UNDO_LIMIT = 30
const TOUCH_INTERVAL_MS = 60_000

export function useHostGame(code: string, hostUid: string) {
  const status = ref<"loading" | "ready" | "missing">("loading")
  const state = shallowRef<GameState | null>(null)
  const gamefile = shallowRef<Gamefile | null>(null)
  const entries = ref<FinalEntries>({})
  const notice = ref("")
  const expiresAt = ref(0)
  const ttlHours = ref(6)
  const undoStack = shallowRef<GameState[]>([])
  const now = ref(serverNow())

  let lastTouch = 0
  let entriesTimer: ReturnType<typeof setTimeout> | undefined
  const clock = setInterval(() => {
    now.value = serverNow()
  }, 1000)
  onScopeDispose(() => {
    clearInterval(clock)
    clearTimeout(entriesTimer)
  })

  const msLeft = computed(() => Math.max(0, expiresAt.value - now.value))
  const canUndo = computed(() => undoStack.value.length > 0)

  async function load() {
    try {
      const snapshot = await loadHostGame(code)
      const parsed = parseGamefile(snapshot.gamefileJson)
      if (!parsed.ok) throw new Error("The stored Gamefile is invalid.")
      gamefile.value = parsed.gamefile
      state.value = snapshot.state
      expiresAt.value = snapshot.meta.expiresAt
      ttlHours.value = snapshot.meta.ttlHours
      lastTouch = serverNow()
      if (snapshot.finalEntriesJson) {
        const result = finalEntriesSchema.safeParse(JSON.parse(snapshot.finalEntriesJson))
        if (result.success) entries.value = result.data
      }
      status.value = "ready"
    } catch {
      status.value = "missing"
    }
  }

  async function touch() {
    if (serverNow() - lastTouch < TOUCH_INTERVAL_MS) return
    lastTouch = serverNow()
    try {
      expiresAt.value = await extendExpiry(hostUid, code, ttlHours.value)
    } catch {
      /* the next action will try again */
    }
  }

  async function persist(next: GameState) {
    try {
      await writeState(code, next)
      notice.value = ""
      void touch()
    } catch {
      notice.value = "Could not save. Check your connection; the game may have expired."
    }
  }

  /** Apply an engine action, keep an undo copy, and save. Engine errors become notices. */
  function run(action: (current: GameState, file: Gamefile) => GameState) {
    const current = state.value
    const file = gamefile.value
    if (!current || !file) return
    try {
      const next = action(current, file)
      undoStack.value = [...undoStack.value.slice(-(UNDO_LIMIT - 1)), current]
      state.value = next
      notice.value = ""
      void persist(next)
    } catch (error) {
      if (error instanceof GameError) notice.value = error.message
      else throw error
    }
  }

  function undo() {
    const previous = undoStack.value.at(-1)
    if (!previous) return
    undoStack.value = undoStack.value.slice(0, -1)
    state.value = previous
    void persist(previous)
  }

  function setEntries(next: FinalEntries) {
    entries.value = next
    clearTimeout(entriesTimer)
    entriesTimer = setTimeout(() => {
      writeFinalEntries(code, JSON.stringify(next)).catch(() => {
        notice.value = "Could not save Final Peril entries."
      })
    }, 400)
  }

  async function endGame() {
    await deleteGame(hostUid, code)
  }

  return {
    status,
    state,
    gamefile,
    entries,
    notice,
    msLeft,
    canUndo,
    load,
    undo,
    endGame,
    setEntries,
    selectClue: (c: number, i: number) => run((s, f) => selectClue(s, f, c, i)),
    setWager: (amount: number, override: boolean) =>
      run((s, f) => setDoubleDownWager(s, f, amount, override)),
    revealResponse: () => run((s, f) => revealResponse(s, f)),
    judge: (id: string, result: "correct" | "incorrect") =>
      run((s, f) => judgeResponse(s, f, id, result)),
    closeClue: () => run((s) => closeClue(s)),
    setActive: (id: string | null) => run((s) => setActiveContestant(s, id)),
    setScore: (id: string, score: number) => run((s) => adjustScore(s, id, score)),
    advance: () => run((s, f) => advanceFromBoard(s, f)),
    finalNext: () => run((s, f) => advanceFinalStage(s, f, entries.value)),
    finalReveal: (id: string) => run((s) => revealFinalEntry(s, entries.value, id)),
    finalShowCorrect: () => run((s, f) => revealFinalCorrectResponse(s, f)),
    finalJudge: (id: string, correct: boolean) => run((s) => judgeFinal(s, id, correct)),
    finish: () => run((s) => finishGame(s)),
  }
}
