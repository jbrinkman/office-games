import { describe, expect, it } from "vitest"
import { extractGameCode } from "./gamecode.ts"

describe("extractGameCode", () => {
  it("normalizes a bare code", () => {
    expect(extractGameCode("  k7m2-qx ")).toBe("K7M2QX")
  })

  it("pulls the code out of a pasted link", () => {
    expect(extractGameCode("https://peril-2310e.web.app/g/k7m2qx")).toBe("K7M2QX")
    expect(extractGameCode("http://localhost:5173/g/K7M2QX?x=1#top")).toBe("K7M2QX")
  })

  it("ignores the host part of a link that is not a game link", () => {
    expect(extractGameCode("https://peril-2310e.web.app/")).toBe("HTTPSPERIL2310EWEBAPP")
  })

  it("returns an empty string for nothing useful", () => {
    expect(extractGameCode("  ---  ")).toBe("")
  })
})
