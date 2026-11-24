import { writeFileSync } from "node:fs"
import { z } from "zod"
import { gamefileSchema } from "../src/gamefile.ts"

const schema = z.toJSONSchema(gamefileSchema, { io: "input" })
const out = new URL("../gamefile.schema.json", import.meta.url)
const copy = new URL("../../../apps/peril/public/games/gamefile.schema.json", import.meta.url)
writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`)
writeFileSync(copy, `${JSON.stringify(schema, null, 2)}\n`)
console.log(`Wrote ${out.pathname}`)
