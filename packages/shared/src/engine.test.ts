import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { Gamefile } from "./index.ts"
import {
  adjustScore,
  advanceFinalStage,
  advanceFromBoard,
  closeClue,
  createGame,
  finishGame,
  GameError,
  isBoardCleared,
  judgeFinal,
  judgeResponse,
  maxDoubleDownWager,
  parseGamefile,
  parseState,
  revealFinalCorrectResponse,
  revealFinalEntry,
  revealResponse,
  selectClue,
  serializeState,
  setActiveContestant,
  setDoubleDownWager,
  winners,
} from "./index.ts"

const parsed = parseGamefile(
  readFileSync(new URL("../../../apps/peril/public/games/sample.json", import.meta.url), "utf8"),
)
if (!parsed.ok) throw new Error(parsed.errors.join("\n"))
const gamefile: Gamefile = parsed.gamefile
const start = () => createGame(gamefile, ["Ana", "Ben", "Cy"])

describe("createGame", () => {
  it("builds the first board with zero scores", () => {
    const state = start()
    expect(state.categories).toHaveLength(6)
    expect(state.contestants.map((c) => c.score)).toEqual([0, 0, 0])
    expect(state.activeContestantId).toBeNull()
  })

  it("enforces 2 to 6 unique, named Contestants", () => {
    expect(() => createGame(gamefile, ["Solo"])).toThrow(GameError)
    expect(() => createGame(gamefile, ["A", "B", "C", "D", "E", "F", "G"])).toThrow(GameError)
    expect(() => createGame(gamefile, ["Ana", "ana"])).toThrow(GameError)
    expect(() => createGame(gamefile, ["Ana", " "])).toThrow(GameError)
  })
})

describe("clues and judging", () => {
  it("never puts an unrevealed Response in public state", () => {
    const state = selectClue(start(), gamefile, 0, 0)
    expect(state.current?.clue).toContain("Red Planet")
    expect(state.current?.response).toBeNull()
    expect(JSON.stringify(state)).not.toContain("What is Mars")
  })

  it("adds the value and gives control for a correct Response", () => {
    let state = selectClue(start(), gamefile, 0, 1)
    state = judgeResponse(state, gamefile, "c2", "correct")
    expect(state.contestants[1]?.score).toBe(400)
    expect(state.activeContestantId).toBe("c2")
    expect(state.current?.resolved).toBe(true)
    expect(state.current?.response).toBe("What is the Moon?")
  })

  it("subtracts the value for an incorrect Response and lets others try", () => {
    let state = selectClue(start(), gamefile, 0, 0)
    state = judgeResponse(state, gamefile, "c1", "incorrect")
    expect(state.contestants[0]?.score).toBe(-200)
    expect(state.current?.resolved).toBe(false)
    expect(() => judgeResponse(state, gamefile, "c1", "incorrect")).toThrow(GameError)
    state = judgeResponse(state, gamefile, "c3", "correct")
    expect(state.contestants[2]?.score).toBe(200)
  })

  it("does not change who is active on an incorrect Response", () => {
    let state = setActiveContestant(start(), "c1")
    state = selectClue(state, gamefile, 0, 0)
    state = judgeResponse(state, gamefile, "c2", "incorrect")
    expect(state.activeContestantId).toBe("c1")
  })

  it("marks the Clue played when closed, even if nobody got it", () => {
    let state = selectClue(start(), gamefile, 0, 0)
    state = revealResponse(state, gamefile)
    state = closeClue(state)
    expect(state.phase).toBe("board")
    expect(state.categories[0]?.cells[0]?.used).toBe(true)
    expect(() => selectClue(state, gamefile, 0, 0)).toThrow(GameError)
  })
})

describe("Double Down", () => {
  const atDoubleDown = () => {
    const state = setActiveContestant(start(), "c1")
    return selectClue(state, gamefile, 3, 3)
  }

  it("hides the Clue until the wager is set", () => {
    const state = atDoubleDown()
    expect(state.current?.doubleDown).toBe(true)
    expect(state.current?.clue).toBeNull()
    expect(() => judgeResponse(state, gamefile, "c1", "correct")).toThrow(GameError)
  })

  it("caps the wager at the higher of the score and the board maximum", () => {
    const state = atDoubleDown()
    expect(maxDoubleDownWager(state)).toBe(1000)
    expect(() => setDoubleDownWager(state, gamefile, 1001)).toThrow(GameError)
    expect(setDoubleDownWager(state, gamefile, 1000).current?.wager).toBe(1000)
  })

  it("allows the Host to override the cap", () => {
    expect(setDoubleDownWager(atDoubleDown(), gamefile, 5000, true).current?.wager).toBe(5000)
  })

  it("applies the wager and resolves either way", () => {
    const wagered = setDoubleDownWager(atDoubleDown(), gamefile, 500)
    const wrong = judgeResponse(wagered, gamefile, "c1", "incorrect")
    expect(wrong.contestants[0]?.score).toBe(-500)
    expect(wrong.current?.resolved).toBe(true)
    const right = judgeResponse(wagered, gamefile, "c1", "correct")
    expect(right.contestants[0]?.score).toBe(500)
  })

  it("only lets the Active Contestant answer", () => {
    const wagered = setDoubleDownWager(atDoubleDown(), gamefile, 500)
    expect(() => judgeResponse(wagered, gamefile, "c2", "correct")).toThrow(GameError)
  })

  it("needs an Active Contestant before wagering", () => {
    const state = selectClue(start(), gamefile, 3, 3)
    expect(() => setDoubleDownWager(state, gamefile, 100)).toThrow(GameError)
  })
})

function playOutBoard(state: ReturnType<typeof start>) {
  let next = state
  for (let c = 0; c < next.categories.length; c++) {
    for (let i = 0; i < 5; i++) {
      next = closeClue(selectClue(next, gamefile, c, i))
    }
  }
  return next
}

describe("rounds", () => {
  it("moves to Double Peril with the lowest scorer in control", () => {
    let state = adjustScore(start(), "c1", 300)
    state = adjustScore(state, "c2", -100)
    state = playOutBoard(state)
    expect(isBoardCleared(state)).toBe(true)
    state = advanceFromBoard(state, gamefile)
    expect(state.roundIndex).toBe(1)
    expect(state.categories[0]?.cells[0]?.value).toBe(400)
    expect(state.activeContestantId).toBe("c2")
  })

  it("round trips through serialization", () => {
    const state = selectClue(start(), gamefile, 0, 0)
    expect(parseState(serializeState(state))).toEqual(state)
    expect(parseState("garbage")).toBeNull()
  })
})

describe("Final Peril", () => {
  const atFinal = () => {
    let state = start()
    state = adjustScore(state, "c1", 2000)
    state = adjustScore(state, "c2", 1000)
    state = adjustScore(state, "c3", -500)
    state = playOutBoard(state)
    state = advanceFromBoard(state, gamefile)
    state = playOutBoard(state)
    return advanceFromBoard(state, gamefile)
  }

  it("only includes positive scorers, lowest score first", () => {
    const state = atFinal()
    expect(state.phase).toBe("final")
    expect(state.final?.reveals.map((r) => r.contestantId)).toEqual(["c2", "c1"])
  })

  it("rejects missing or oversized wagers", () => {
    const state = advanceFinalStage(atFinal(), gamefile)
    expect(() => advanceFinalStage(state, gamefile, {})).toThrow(GameError)
    expect(() =>
      advanceFinalStage(state, gamefile, {
        c1: { wager: 2001, response: "x" },
        c2: { wager: 0, response: "x" },
      }),
    ).toThrow(GameError)
  })

  it("runs category, wagers, clue, then reveal without leaking early", () => {
    const entries = {
      c1: { wager: 2000, response: "What is New Zealand?" },
      c2: { wager: 1000, response: "What is France?" },
    }
    let state = advanceFinalStage(atFinal(), gamefile)
    expect(state.final?.clue).toBeNull()
    state = advanceFinalStage(state, gamefile, entries)
    expect(state.final?.clue).toContain("1893")
    expect(JSON.stringify(state)).not.toContain("What is France?")
    state = advanceFinalStage(state, gamefile)
    expect(state.final?.stage).toBe("reveal")

    state = revealFinalEntry(state, entries, "c2")
    expect(() => judgeFinal(state, "c1", true)).toThrow(GameError)
    state = judgeFinal(state, "c2", false)
    state = revealFinalEntry(state, entries, "c1")
    state = revealFinalCorrectResponse(state, gamefile)
    expect(state.final?.correctResponse).toBe("What is New Zealand?")
    state = judgeFinal(state, "c1", true)

    expect(state.contestants.map((c) => c.score)).toEqual([4000, 0, -500])
    state = finishGame(state)
    expect(state.phase).toBe("finished")
    expect(winners(state)).toEqual(["c1"])
  })

  it("will not finish with unjudged entries", () => {
    const entries = {
      c1: { wager: 0, response: "" },
      c2: { wager: 0, response: "" },
    }
    let state = advanceFinalStage(advanceFinalStage(atFinal(), gamefile), gamefile, entries)
    state = advanceFinalStage(state, gamefile)
    expect(() => finishGame(state)).toThrow(GameError)
  })

  it("skips Final Peril when nobody has a positive score", () => {
    let state = playOutBoard(start())
    state = advanceFromBoard(state, gamefile)
    state = playOutBoard(state)
    expect(advanceFromBoard(state, gamefile).phase).toBe("finished")
  })
})
