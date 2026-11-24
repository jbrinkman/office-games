import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { emailToAllowlistKey } from "./allowlist.ts"

describe("emailToAllowlistKey", () => {
  it("lowercases and swaps dots for commas", () => {
    expect(emailToAllowlistKey("Jane.Smith@Gmail.com")).toBe("jane,smith@gmail,com")
  })

  it("trims whitespace", () => {
    expect(emailToAllowlistKey("  a@b.co ")).toBe("a@b,co")
  })

  it("uses the same encoding as the security rules", () => {
    const rules = readFileSync(
      new URL("../../../firebase/database.rules.json", import.meta.url),
      "utf8",
    )
    expect(rules).toContain("auth.token.email.toLowerCase().replace('.', ',')")
  })
})
