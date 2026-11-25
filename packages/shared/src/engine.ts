import type { Gamefile } from "./gamefile.ts"
import type { FinalEntries, GameState } from "./state.ts"

export class GameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GameError"
  }
}

export const MIN_CONTESTANTS = 2
export const MAX_CONTESTANTS = 6

export const ROUND_NAMES = ["Peril!", "Double Peril!"] as const

function fail(message: string): never {
  throw new GameError(message)
}

function clone(state: GameState): GameState {
  return structuredClone(state)
}

function boardFor(gamefile: Gamefile, roundIndex: number): GameState["categories"] {
  const round = gamefile.rounds[roundIndex] ?? fail("That round does not exist.")
  return round.categories.map((category) => ({
    name: category.name,
    hint: category.hint ?? null,
    cells: category.clues.map((clue) => ({ value: clue.value, used: false })),
  }))
}

export function createGame(gamefile: Gamefile, contestantNames: string[]): GameState {
  const names = contestantNames.map((n) => n.trim())
  if (names.length < MIN_CONTESTANTS || names.length > MAX_CONTESTANTS) {
    fail(`A game needs ${MIN_CONTESTANTS} to ${MAX_CONTESTANTS} Contestants.`)
  }
  if (names.some((n) => n.length === 0 || n.length > 30)) {
    fail("Contestant names must be 1 to 30 characters.")
  }
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
    fail("Contestant names must be unique.")
  }
  return {
    version: 1,
    title: gamefile.title,
    phase: "intro",
    roundIndex: 0,
    roundCount: gamefile.rounds.length,
    hasFinal: gamefile.final !== undefined,
    contestants: names.map((name, i) => ({ id: `c${i + 1}`, name, score: 0 })),
    activeContestantId: null,
    categories: boardFor(gamefile, 0),
    intro: { revealed: 0 },
    current: null,
    final: null,
  }
}

/** Reveal the next category name (and its hint) during the start-of-round introduction. */
export function revealNextCategory(state: GameState): GameState {
  if (state.phase !== "intro" || !state.intro)
    fail("There is no category introduction to continue.")
  if (state.intro.revealed >= state.categories.length) {
    fail("Every category has already been revealed.")
  }
  const next = clone(state)
  next.intro = { revealed: state.intro.revealed + 1 }
  return next
}

/** End the introduction (even early) and open the board for play. */
export function startRound(state: GameState): GameState {
  if (state.phase !== "intro") fail("The round has already started.")
  const next = clone(state)
  next.phase = "board"
  next.intro = null
  return next
}

function contestantOf(state: GameState, id: string) {
  return state.contestants.find((c) => c.id === id) ?? fail("That Contestant does not exist.")
}

export function setActiveContestant(state: GameState, id: string | null): GameState {
  if (id !== null) contestantOf(state, id)
  const next = clone(state)
  next.activeContestantId = id
  return next
}

export function adjustScore(state: GameState, id: string, newScore: number): GameState {
  if (!Number.isInteger(newScore)) fail("A score must be a whole number.")
  const next = clone(state)
  contestantOf(next, id).score = newScore
  return next
}

export function selectClue(
  state: GameState,
  gamefile: Gamefile,
  categoryIndex: number,
  clueIndex: number,
): GameState {
  if (state.phase !== "board") fail("Clues can only be chosen from the board.")
  const cell =
    state.categories[categoryIndex]?.cells[clueIndex] ?? fail("That Clue does not exist.")
  if (cell.used) fail("That Clue has already been played.")
  const clue =
    gamefile.rounds[state.roundIndex]?.categories[categoryIndex]?.clues[clueIndex] ??
    fail("That Clue is missing from the Gamefile.")
  const next = clone(state)
  next.phase = "clue"
  next.current = {
    categoryIndex,
    clueIndex,
    value: clue.value,
    clue: clue.doubleDown ? null : clue.clue,
    doubleDown: clue.doubleDown === true,
    wager: null,
    responseRevealed: false,
    response: null,
    resolved: false,
    judged: [],
  }
  return next
}

/** The standard Double Down cap: the Contestant's score, or the highest value on the board if more. */
export function maxDoubleDownWager(state: GameState): number {
  const active = state.contestants.find((c) => c.id === state.activeContestantId)
  const boardMax = Math.max(
    0,
    ...state.categories.flatMap((c) => c.cells.map((cell) => cell.value)),
  )
  return Math.max(active?.score ?? 0, boardMax)
}

export function setDoubleDownWager(
  state: GameState,
  gamefile: Gamefile,
  wager: number,
  override = false,
): GameState {
  const current = state.current
  if (state.phase !== "clue" || !current?.doubleDown) fail("There is no Double Down to wager on.")
  if (current.wager !== null) fail("The wager has already been set.")
  if (state.activeContestantId === null) fail("Choose the Active Contestant before wagering.")
  if (!Number.isInteger(wager) || wager < 0) fail("A wager must be a whole number, 0 or more.")
  const max = maxDoubleDownWager(state)
  if (!override && wager > max) fail(`The wager cannot be more than ${max}.`)
  const clue =
    gamefile.rounds[state.roundIndex]?.categories[current.categoryIndex]?.clues[
      current.clueIndex
    ] ?? fail("That Clue is missing from the Gamefile.")
  const next = clone(state)
  const nextCurrent = next.current ?? fail("There is no current Clue.")
  nextCurrent.wager = wager
  nextCurrent.clue = clue.clue
  return next
}

function revealCurrentResponse(next: GameState, gamefile: Gamefile): void {
  const current = next.current ?? fail("There is no current Clue.")
  const clue =
    gamefile.rounds[next.roundIndex]?.categories[current.categoryIndex]?.clues[current.clueIndex] ??
    fail("That Clue is missing from the Gamefile.")
  current.responseRevealed = true
  current.response = clue.response
}

export function revealResponse(state: GameState, gamefile: Gamefile): GameState {
  if (state.phase !== "clue" || !state.current) fail("There is no Clue to reveal.")
  if (state.current.clue === null) fail("Set the Double Down wager first.")
  const next = clone(state)
  revealCurrentResponse(next, gamefile)
  return next
}

export function judgeResponse(
  state: GameState,
  gamefile: Gamefile,
  contestantId: string,
  result: "correct" | "incorrect",
): GameState {
  const current = state.current
  if (state.phase !== "clue" || !current) fail("There is no Clue to judge.")
  if (current.clue === null) fail("Set the Double Down wager first.")
  if (current.resolved) fail("This Clue has already been resolved.")
  contestantOf(state, contestantId)
  if (current.judged.some((j) => j.contestantId === contestantId)) {
    fail("That Contestant has already responded to this Clue.")
  }
  if (current.doubleDown && contestantId !== state.activeContestantId) {
    fail("Only the Active Contestant can respond to a Double Down.")
  }
  const amount = current.doubleDown ? (current.wager ?? 0) : current.value
  const next = clone(state)
  const nextCurrent = next.current ?? fail("There is no current Clue.")
  const contestant = contestantOf(next, contestantId)
  nextCurrent.judged.push({ contestantId, result })
  if (result === "correct") {
    contestant.score += amount
    next.activeContestantId = contestantId
    nextCurrent.resolved = true
    revealCurrentResponse(next, gamefile)
  } else {
    contestant.score -= amount
    if (current.doubleDown) {
      nextCurrent.resolved = true
      revealCurrentResponse(next, gamefile)
    }
  }
  return next
}

/** Return to the board, marking the Clue as played (whether or not anyone got it). */
export function closeClue(state: GameState): GameState {
  if (state.phase !== "clue" || !state.current) fail("There is no Clue to close.")
  const next = clone(state)
  const { categoryIndex, clueIndex } = state.current
  const cell = next.categories[categoryIndex]?.cells[clueIndex] ?? fail("That Clue does not exist.")
  cell.used = true
  next.current = null
  next.phase = "board"
  return next
}

export function isBoardCleared(state: GameState): boolean {
  return state.categories.every((c) => c.cells.every((cell) => cell.used))
}

function lowestScoreContestantId(state: GameState): string | null {
  const lowest = [...state.contestants].sort((a, b) => a.score - b.score)[0]
  return lowest?.id ?? null
}

/** Move from the board to the next round, or to Final Peril, or to the end of the game. */
export function advanceFromBoard(state: GameState, gamefile: Gamefile): GameState {
  if (state.phase !== "board") fail("Finish the current Clue first.")
  const next = clone(state)
  if (state.roundIndex + 1 < state.roundCount) {
    next.roundIndex = state.roundIndex + 1
    next.categories = boardFor(gamefile, next.roundIndex)
    next.phase = "intro"
    next.intro = { revealed: 0 }
    next.activeContestantId = lowestScoreContestantId(state)
    return next
  }
  if (!state.hasFinal || !gamefile.final) {
    next.phase = "finished"
    return next
  }
  const entrants = state.contestants.filter((c) => c.score > 0).sort((a, b) => a.score - b.score)
  if (entrants.length === 0) {
    next.phase = "finished"
    return next
  }
  next.phase = "final"
  next.activeContestantId = null
  next.final = {
    stage: "category",
    category: gamefile.final.category,
    clue: null,
    correctResponse: null,
    reveals: entrants.map((c) => ({
      contestantId: c.id,
      wager: null,
      response: null,
      correct: null,
    })),
  }
  return next
}

/** Final Peril entrants (positive score), in reveal order from lowest score up. */
export function finalEntrants(state: GameState): string[] {
  return state.final?.reveals.map((r) => r.contestantId) ?? []
}

export function validateFinalEntries(state: GameState, entries: FinalEntries): string[] {
  const problems: string[] = []
  for (const id of finalEntrants(state)) {
    const contestant = state.contestants.find((c) => c.id === id)
    const entry = entries[id]
    if (!contestant) continue
    if (!entry) {
      problems.push(`${contestant.name} needs a wager.`)
      continue
    }
    if (!Number.isInteger(entry.wager) || entry.wager < 0 || entry.wager > contestant.score) {
      problems.push(`${contestant.name}'s wager must be between 0 and ${contestant.score}.`)
    }
  }
  return problems
}

export function advanceFinalStage(
  state: GameState,
  gamefile: Gamefile,
  entries: FinalEntries = {},
): GameState {
  const final = state.final
  if (state.phase !== "final" || !final || !gamefile.final) fail("Final Peril is not in progress.")
  const next = clone(state)
  const nextFinal = next.final ?? fail("Final Peril is not in progress.")
  if (final.stage === "category") {
    nextFinal.stage = "wagers"
  } else if (final.stage === "wagers") {
    const problems = validateFinalEntries(state, entries)
    if (problems.length > 0) fail(problems.join(" "))
    nextFinal.stage = "clue"
    nextFinal.clue = gamefile.final.clue
  } else if (final.stage === "clue") {
    nextFinal.stage = "reveal"
  } else {
    fail("Final Peril is already at its last stage.")
  }
  return next
}

export function revealFinalEntry(
  state: GameState,
  entries: FinalEntries,
  contestantId: string,
): GameState {
  if (state.phase !== "final" || state.final?.stage !== "reveal") fail("Not in the reveal stage.")
  const entry = entries[contestantId] ?? fail("That Contestant has no Final Peril entry.")
  const next = clone(state)
  const reveal =
    next.final?.reveals.find((r) => r.contestantId === contestantId) ??
    fail("That Contestant is not in Final Peril.")
  reveal.wager = entry.wager
  reveal.response = entry.response.trim() === "" ? "(no response)" : entry.response.trim()
  return next
}

export function revealFinalCorrectResponse(state: GameState, gamefile: Gamefile): GameState {
  if (state.phase !== "final" || state.final?.stage !== "reveal") fail("Not in the reveal stage.")
  const next = clone(state)
  const final = next.final ?? fail("Final Peril is not in progress.")
  final.correctResponse = gamefile.final?.response ?? null
  return next
}

export function judgeFinal(state: GameState, contestantId: string, correct: boolean): GameState {
  if (state.phase !== "final" || state.final?.stage !== "reveal") fail("Not in the reveal stage.")
  const next = clone(state)
  const reveal =
    next.final?.reveals.find((r) => r.contestantId === contestantId) ??
    fail("That Contestant is not in Final Peril.")
  if (reveal.wager === null) fail("Reveal the entry before judging it.")
  if (reveal.correct !== null) fail("That entry has already been judged.")
  reveal.correct = correct
  const contestant = contestantOf(next, contestantId)
  contestant.score += correct ? reveal.wager : -reveal.wager
  return next
}

export function finishGame(state: GameState): GameState {
  if (state.phase === "final" && state.final?.reveals.some((r) => r.correct === null)) {
    fail("Judge every Final Peril entry first.")
  }
  const next = clone(state)
  next.phase = "finished"
  next.activeContestantId = null
  return next
}

/** The highest-scoring Contestant(s); more than one id means a tie. */
export function winners(state: GameState): string[] {
  const top = Math.max(...state.contestants.map((c) => c.score))
  return state.contestants.filter((c) => c.score === top).map((c) => c.id)
}
