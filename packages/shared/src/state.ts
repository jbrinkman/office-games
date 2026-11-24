import { z } from "zod"

/** Public game state. Everything here is visible to Viewers, so it never holds unrevealed Responses. */

export const contestantSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.int(),
})

export const cellSchema = z.object({ value: z.int(), used: z.boolean() })
export const boardCategorySchema = z.object({ name: z.string(), cells: z.array(cellSchema) })

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
  phase: z.enum(["board", "clue", "final", "finished"]),
  roundIndex: z.int(),
  roundCount: z.int(),
  hasFinal: z.boolean(),
  contestants: z.array(contestantSchema),
  activeContestantId: z.string().nullable(),
  categories: z.array(boardCategorySchema),
  current: currentClueSchema.nullable(),
  final: finalStateSchema.nullable(),
})

export type Contestant = z.infer<typeof contestantSchema>
export type BoardCategory = z.infer<typeof boardCategorySchema>
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
