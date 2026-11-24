import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { gamefileSchema, parseGamefile } from "./gamefile.ts"

const samplePath = new URL("../../../apps/peril/public/games/sample.json", import.meta.url)
const loadSample = () => JSON.parse(readFileSync(samplePath, "utf8"))

describe("parseGamefile", () => {
  it("accepts the bundled sample game", () => {
    expect(parseGamefile(readFileSync(samplePath, "utf8")).ok).toBe(true)
  })

  it("rejects text that is not JSON", () => {
    expect(parseGamefile("{nope")).toEqual({ ok: false, errors: ["The file is not valid JSON."] })
  })

  it("reports where a Gamefile is invalid", () => {
    const sample = loadSample()
    sample.rounds[0].categories[0].clues.pop()
    const result = parseGamefile(JSON.stringify(sample))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join("\n")).toContain("rounds.0.categories.0.clues")
  })

  it("rejects more than two Double Downs in a round", () => {
    const sample = loadSample()
    for (const category of sample.rounds[1].categories) category.clues[0].doubleDown = true
    expect(parseGamefile(JSON.stringify(sample)).ok).toBe(false)
  })

  it("keeps the committed JSON Schema in sync with the Zod schema", () => {
    const committed = JSON.parse(
      readFileSync(new URL("../gamefile.schema.json", import.meta.url), "utf8"),
    )
    const generated = JSON.parse(JSON.stringify(z.toJSONSchema(gamefileSchema, { io: "input" })))
    expect(committed).toEqual(generated)
  })
})
