import { type Gamefile, type GameState, parseState, serializeState } from "@office-games/shared"
import { get, onValue, ref, remove, set, update } from "firebase/database"
import { db, serverNow } from "./firebase.ts"

const HOUR = 3_600_000
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const MAX_GAMEFILE_CHARS = 200_000

export function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export function isValidCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code)
}

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")
}

export interface GameMeta {
  hostUid: string
  ttlHours: number
  expiresAt: number
}

/** Claim a fresh game code, then write the first state. Returns the code. */
export async function createGameRecord(
  hostUid: string,
  gamefile: Gamefile,
  state: GameState,
  ttlHours: number,
): Promise<string> {
  const privateGamefile = JSON.stringify(gamefile)
  if (privateGamefile.length > MAX_GAMEFILE_CHARS) {
    throw new Error("That Gamefile is too large to host.")
  }
  const expiresAt = serverNow() + ttlHours * HOUR
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      await set(ref(db, `games/${code}/meta`), { hostUid, ttlHours, expiresAt })
    } catch (error) {
      lastError = error // most likely the code is taken, so try another
      continue
    }
    await set(ref(db, `games/${code}/public`), { state: serializeState(state) })
    await set(ref(db, `games/${code}/private`), { gamefile: privateGamefile })
    await set(ref(db, `hosts/${hostUid}/${code}`), expiresAt)
    return code
  }
  throw lastError instanceof Error ? lastError : new Error("Could not create a game code.")
}

export interface HostGameSnapshot {
  meta: GameMeta
  state: GameState
  gamefileJson: string
  finalEntriesJson: string | null
}

/** Load everything the Host needs to resume a game. Throws if it is missing, expired, or not theirs. */
export async function loadHostGame(code: string): Promise<HostGameSnapshot> {
  const [meta, state, priv] = await Promise.all([
    get(ref(db, `games/${code}/meta`)),
    get(ref(db, `games/${code}/public/state`)),
    get(ref(db, `games/${code}/private`)),
  ])
  const metaValue = meta.val() as GameMeta | null
  const parsed = typeof state.val() === "string" ? parseState(state.val() as string) : null
  const privateValue = priv.val() as { gamefile?: string; final?: string } | null
  if (!metaValue || !parsed || !privateValue?.gamefile) throw new Error("Game not found.")
  return {
    meta: metaValue,
    state: parsed,
    gamefileJson: privateValue.gamefile,
    finalEntriesJson: privateValue.final ?? null,
  }
}

export function writeState(code: string, state: GameState): Promise<string> {
  const raw = serializeState(state)
  return set(ref(db, `games/${code}/public/state`), raw).then(() => raw)
}

export function writeFinalEntries(code: string, json: string): Promise<void> {
  return set(ref(db, `games/${code}/private/final`), json)
}

/** Push the expiry out to now + the game's lifetime. */
export async function extendExpiry(
  hostUid: string,
  code: string,
  ttlHours: number,
): Promise<number> {
  const expiresAt = serverNow() + ttlHours * HOUR
  await update(ref(db), {
    [`games/${code}/meta/expiresAt`]: expiresAt,
    [`hosts/${hostUid}/${code}`]: expiresAt,
  })
  return expiresAt
}

export async function deleteGame(hostUid: string, code: string): Promise<void> {
  await remove(ref(db, `games/${code}`))
  await remove(ref(db, `hosts/${hostUid}/${code}`))
}

/** Active games this Host can resume. Also removes their expired games, since there is no server to do it. */
export async function listAndSweepHostGames(
  hostUid: string,
): Promise<{ code: string; expiresAt: number }[]> {
  const snapshot = await get(ref(db, `hosts/${hostUid}`))
  const entries = Object.entries((snapshot.val() ?? {}) as Record<string, number>)
  const now = serverNow()
  const live: { code: string; expiresAt: number }[] = []
  for (const [code, expiresAt] of entries) {
    if (expiresAt > now) {
      live.push({ code, expiresAt })
    } else {
      await deleteGame(hostUid, code).catch(() => undefined)
    }
  }
  return live.sort((a, b) => b.expiresAt - a.expiresAt)
}

export type ViewerEvent =
  | { kind: "state"; state: GameState }
  | { kind: "missing" }
  | { kind: "error"; message: string }

/** Subscribe to a game's public state. Returns an unsubscribe function. */
export function subscribeToState(code: string, onEvent: (event: ViewerEvent) => void): () => void {
  return onValue(
    ref(db, `games/${code}/public/state`),
    (snapshot) => {
      const raw = snapshot.val()
      const state = typeof raw === "string" ? parseState(raw) : null
      onEvent(state ? { kind: "state", state } : { kind: "missing" })
    },
    (error) => {
      // Expired and unknown games are both refused by the rules.
      onEvent(
        error.message.toLowerCase().includes("permission")
          ? { kind: "missing" }
          : { kind: "error", message: error.message },
      )
    },
  )
}
