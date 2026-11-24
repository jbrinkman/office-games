import { readFileSync } from "node:fs"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { get, ref, remove, set } from "firebase/database"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"

const HOUR = 3_600_000
const CODE = "ABCD23"
let env: RulesTestEnvironment

const meta = (hostUid: string, hoursLeft = 6, ttlHours = 6) => ({
  hostUid,
  ttlHours,
  expiresAt: Date.now() + hoursLeft * HOUR,
})

beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000").split(":")
  env = await initializeTestEnvironment({
    projectId: "demo-office-games",
    database: {
      host,
      port: Number(port),
      rules: readFileSync(new URL("./database.rules.json", import.meta.url), "utf8"),
    },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearDatabase()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database()
    await set(ref(db, "allowedHosts/host@example,com"), true)
    await set(ref(db, "allowedHosts/other@example,com"), true)
    await set(ref(db, "allowedHosts/jo,smith@my,org,example,com"), true)
    await set(ref(db, "allowedHosts/removed@example,com"), false)
  })
})

/** Seed a live game owned by "host1" without going through the rules. */
async function seed(hoursLeft = 6) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database()
    await set(ref(db, `games/${CODE}/meta`), meta("host1", hoursLeft))
    await set(ref(db, `games/${CODE}/public`), { state: "{}" })
    await set(ref(db, `games/${CODE}/private`), { gamefile: "{secret responses}" })
  })
}

const asUser = (uid: string, email: string, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).database()

// Both are on the allowlist (see beforeEach). Their emails are stored dot-free in the database.
const host = () => asUser("host1", "host@example.com")
const other = () => asUser("someone-else", "other@example.com")
const viewer = () => env.unauthenticatedContext().database()

describe("who can host", () => {
  const claim = (db: ReturnType<typeof host>, uid: string) =>
    set(ref(db, `games/${CODE}/meta`), meta(uid))

  it("accepts a listed account, whatever the letter case", async () => {
    await assertSucceeds(claim(asUser("u1", "Host@Example.COM"), "u1"))
  })

  it("handles addresses with several dots", async () => {
    await assertSucceeds(claim(asUser("u2", "Jo.Smith@my.org.example.com"), "u2"))
  })

  it("rejects a signed-in account that is not on the list", async () => {
    await assertFails(claim(asUser("u3", "stranger@example.com"), "u3"))
  })

  it("rejects a listed address that is not verified", async () => {
    await assertFails(claim(asUser("u4", "host@example.com", false), "u4"))
  })

  it("rejects an address whose list entry is not true", async () => {
    await assertFails(claim(asUser("u5", "removed@example.com"), "u5"))
  })

  it("rejects lookalike addresses", async () => {
    for (const email of ["host@example.com.evil.io", "xhost@example.com", "host@examplexcom"]) {
      await assertFails(claim(asUser("u6", email), "u6"))
    }
  })

  it("rejects an account with no email claim", async () => {
    await assertFails(claim(env.authenticatedContext("u7").database(), "u7"))
  })

  it("keeps unlisted accounts out of the Host game list", async () => {
    await assertFails(
      set(ref(asUser("u8", "stranger@example.com"), `hosts/u8/${CODE}`), Date.now() + HOUR),
    )
  })

  it("lets an account read only its own allowlist entry", async () => {
    await assertSucceeds(get(ref(host(), "allowedHosts/host@example,com")))
    await assertSucceeds(
      get(ref(asUser("u9", "stranger@example.com"), "allowedHosts/stranger@example,com")),
    )
    await assertFails(get(ref(host(), "allowedHosts/other@example,com")))
    await assertFails(get(ref(host(), "allowedHosts")))
    await assertFails(get(ref(viewer(), "allowedHosts/host@example,com")))
  })

  it("never lets a client change the allowlist", async () => {
    await assertFails(set(ref(host(), "allowedHosts/stranger@example,com"), true))
    await assertFails(set(ref(host(), "allowedHosts/host@example,com"), false))
    await assertFails(remove(ref(host(), "allowedHosts/host@example,com")))
    await assertFails(set(ref(viewer(), "allowedHosts/x@example,com"), true))
  })

  it("still lets any Viewer watch without signing in", async () => {
    await seed()
    await assertSucceeds(get(ref(viewer(), `games/${CODE}/public`)))
  })
})

describe("creating a game", () => {
  it("lets a signed-in Host claim a free code", async () => {
    await assertSucceeds(set(ref(host(), `games/${CODE}/meta`), meta("host1")))
  })

  it("rejects an anonymous visitor", async () => {
    await assertFails(set(ref(viewer(), `games/${CODE}/meta`), meta("host1")))
  })

  it("rejects claiming a game for someone else", async () => {
    await assertFails(set(ref(other(), `games/${CODE}/meta`), meta("host1")))
  })

  it("rejects a code that is already taken", async () => {
    await seed()
    await assertFails(set(ref(other(), `games/${CODE}/meta`), meta("someone-else")))
  })

  it("rejects malformed codes", async () => {
    await assertFails(set(ref(host(), "games/abc/meta"), meta("host1")))
    await assertFails(set(ref(host(), "games/ABCDEI/meta"), meta("host1")))
  })

  it("rejects lifetimes outside 1 to 24 hours", async () => {
    await assertFails(set(ref(host(), `games/${CODE}/meta`), meta("host1", 30, 6)))
    await assertFails(set(ref(host(), `games/${CODE}/meta`), meta("host1", 6, 25)))
    await assertFails(set(ref(host(), `games/${CODE}/meta`), meta("host1", 6, 0)))
  })

  it("rejects unexpected fields", async () => {
    await assertFails(set(ref(host(), `games/${CODE}/meta`), { ...meta("host1"), extra: 1 }))
  })
})

describe("reading", () => {
  it("lets any Viewer read public state without signing in", async () => {
    await seed()
    await assertSucceeds(get(ref(viewer(), `games/${CODE}/public`)))
  })

  it("keeps private data and meta away from Viewers and other Hosts", async () => {
    await seed()
    await assertFails(get(ref(viewer(), `games/${CODE}/private`)))
    await assertFails(get(ref(other(), `games/${CODE}/private`)))
    await assertFails(get(ref(viewer(), `games/${CODE}/meta`)))
    await assertFails(get(ref(other(), `games/${CODE}/meta`)))
  })

  it("lets the Host read private data", async () => {
    await seed()
    await assertSucceeds(get(ref(host(), `games/${CODE}/private`)))
    await assertSucceeds(get(ref(host(), `games/${CODE}/meta`)))
  })

  it("does not let anyone list all games", async () => {
    await seed()
    await assertFails(get(ref(viewer(), "games")))
    await assertFails(get(ref(host(), "games")))
  })

  it("hides public state once the game has expired", async () => {
    await seed(-1)
    await assertFails(get(ref(viewer(), `games/${CODE}/public`)))
  })
})

describe("writing", () => {
  it("lets only the Host write public state", async () => {
    await seed()
    await assertSucceeds(set(ref(host(), `games/${CODE}/public/state`), '{"phase":"board"}'))
    await assertFails(set(ref(viewer(), `games/${CODE}/public/state`), "x"))
    await assertFails(set(ref(other(), `games/${CODE}/public/state`), "x"))
  })

  it("lets only the Host write private data", async () => {
    await seed()
    await assertSucceeds(set(ref(host(), `games/${CODE}/private/gamefile`), "{}"))
    await assertFails(set(ref(other(), `games/${CODE}/private/gamefile`), "{}"))
  })

  it("rejects oversized state and unknown fields", async () => {
    await seed()
    await assertFails(set(ref(host(), `games/${CODE}/public/state`), "x".repeat(60001)))
    await assertFails(set(ref(host(), `games/${CODE}/public/other`), "x"))
  })

  it("lets the Host extend the expiry within 24 hours", async () => {
    await seed()
    await assertSucceeds(set(ref(host(), `games/${CODE}/meta/expiresAt`), Date.now() + 8 * HOUR))
    await assertFails(set(ref(host(), `games/${CODE}/meta/expiresAt`), Date.now() + 40 * HOUR))
  })

  it("does not let another Host change the owner or extend the game", async () => {
    await seed()
    await assertFails(set(ref(other(), `games/${CODE}/meta/hostUid`), "someone-else"))
    await assertFails(set(ref(other(), `games/${CODE}/meta/expiresAt`), Date.now() + 2 * HOUR))
  })

  it("freezes an expired game", async () => {
    await seed(-1)
    await assertFails(set(ref(host(), `games/${CODE}/public/state`), "{}"))
    await assertFails(get(ref(host(), `games/${CODE}/private`)))
    await assertFails(set(ref(host(), `games/${CODE}/meta/expiresAt`), Date.now() + HOUR))
  })
})

describe("cleanup", () => {
  it("lets the Host delete their game, even after it expired", async () => {
    await seed(-1)
    await assertSucceeds(remove(ref(host(), `games/${CODE}`)))
  })

  it("does not let others delete a game", async () => {
    await seed()
    await assertFails(remove(ref(other(), `games/${CODE}`)))
    await assertFails(remove(ref(viewer(), `games/${CODE}`)))
  })

  it("keeps each Host's game list private", async () => {
    await assertSucceeds(set(ref(host(), `hosts/host1/${CODE}`), Date.now() + HOUR))
    await assertSucceeds(get(ref(host(), "hosts/host1")))
    await assertFails(get(ref(other(), "hosts/host1")))
    await assertFails(set(ref(other(), `hosts/host1/${CODE}`), 1))
  })
})
