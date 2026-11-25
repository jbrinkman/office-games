import { z } from "zod"

/** Public game state. Everything here is visible to Viewers, so it never holds unrevealed Responses. */

export const contestantSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.int(),
})

export const cellSchema = z.object({ value: z.int(), used: z.boolean() })
export const boardCategorySchema = z.object({
  name: z.string(),
  /** Shown to Viewers while the category is introduced. Null when the Gamefile gave none. */
  hint: z.string().nullable().default(null),
  cells: z.array(cellSchema),
})

/** Progress through the start-of-round category introduction. */
export const introSchema = z.object({
  /** How many categories, left to right, have been revealed so far. */
  revealed: z.int(),
})

export const judgedSchema = z.object({
  contestantId: z.string(),
  result: z.enum(["correct", "incorrect"]),
})

export const currentClueSchema = z.object({
  categoryIndex: z.int(),
  clueIndex: z.int(),
  value: z.int(),
  /** Null while a Double Down is waiting for its wager. */
  clue: z.string().nullable(),
  doubleDown: z.boolean(),
  wager: z.int().nullable(),
  responseRevealed: z.boolean(),
  /** Only filled once the Host reveals it. */
  response: z.string().nullable(),
  resolved: z.boolean(),
  judged: z.array(judgedSchema),
})

export const finalRevealSchema = z.object({
  contestantId: z.string(),
  wager: z.int().nullable(),
  response: z.string().nullable(),
  correct: z.boolean().nullable(),
})

export const finalStateSchema = z.object({
  stage: z.enum(["category", "wagers", "clue", "reveal"]),
  category: z.string(),
  clue: z.string().nullable(),
  correctResponse: z.string().nullable(),
  reveals: z.array(finalRevealSchema),
})

export const gameStateSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  phase: z.enum(["intro", "board", "clue", "final", "finished"]),
  roundIndex: z.int(),
  roundCount: z.int(),
  hasFinal: z.boolean(),
  contestants: z.array(contestantSchema),
  activeContestantId: z.string().nullable(),
  categories: z.array(boardCategorySchema),
  /** Only set while the phase is "intro". */
  intro: introSchema.nullable().default(null),
  current: currentClueSchema.nullable(),
  final: finalStateSchema.nullable(),
})

export type Contestant = z.infer<typeof contestantSchema>
export type BoardCategory = z.infer<typeof boardCategorySchema>
export type Intro = z.infer<typeof introSchema>
export type CurrentClue = z.infer<typeof currentClueSchema>
export type FinalReveal = z.infer<typeof finalRevealSchema>
export type FinalState = z.infer<typeof finalStateSchema>
export type GameState = z.infer<typeof gameStateSchema>

/** Host-only Final Peril entries, kept out of public state until revealed. */
export const finalEntriesSchema = z.record(
  z.string(),
  z.object({ wager: z.int().min(0), response: z.string() }),
)
export type FinalEntries = z.infer<typeof finalEntriesSchema>

export function serializeState(state: GameState): string {
  return JSON.stringify(state)
}

export function parseState(raw: string): GameState | null {
  try {
    const result = gameStateSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
