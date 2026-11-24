import { z } from "zod"

export const CLUES_PER_CATEGORY = 5
export const MAX_CATEGORIES = 6
export const MAX_DOUBLE_DOWNS_PER_ROUND = 2

const text = (max: number) => z.string().trim().min(1).max(max)

export const clueSchema = z.object({
  value: z.int().positive().max(100000),
  clue: text(500),
  response: text(200),
  doubleDown: z.boolean().optional(),
})

export const categorySchema = z.object({
  name: text(60),
  clues: z.array(clueSchema).length(CLUES_PER_CATEGORY),
})

export const roundSchema = z
  .object({ categories: z.array(categorySchema).min(1).max(MAX_CATEGORIES) })
  .refine(
    (round) =>
      round.categories.flatMap((c) => c.clues).filter((c) => c.doubleDown).length <=
      MAX_DOUBLE_DOWNS_PER_ROUND,
    { message: `A round can have at most ${MAX_DOUBLE_DOWNS_PER_ROUND} Double Downs` },
  )

export const finalPerilSchema = z.object({
  category: text(60),
  clue: text(500),
  response: text(200),
})

export const gamefileSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal(1),
  title: text(100),
  rounds: z.array(roundSchema).min(1).max(2),
  final: finalPerilSchema.optional(),
})

export type Clue = z.infer<typeof clueSchema>
export type Gamefile = z.infer<typeof gamefileSchema>

export type GamefileParseResult = { ok: true; gamefile: Gamefile } | { ok: false; errors: string[] }

/** Parse and validate raw JSON text from an uploaded or bundled Gamefile. */
export function parseGamefile(raw: string): GamefileParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, errors: ["The file is not valid JSON."] }
  }
  const result = gamefileSchema.safeParse(json)
  if (result.success) return { ok: true, gamefile: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join(".")
      return path ? `${path}: ${issue.message}` : issue.message
    }),
  }
}
