import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { HOST_EMAIL_DOMAIN, isAllowedHostEmail } from "./hosting.ts"

describe("isAllowedHostEmail", () => {
  it("accepts verified addresses in the domain, ignoring case", () => {
    expect(isAllowedHostEmail("jo@improving.com", true)).toBe(true)
    expect(isAllowedHostEmail("Jo.Smith@Improving.COM", true)).toBe(true)
  })

  it("rejects unverified, missing, and other-domain addresses", () => {
    expect(isAllowedHostEmail("jo@improving.com", false)).toBe(false)
    expect(isAllowedHostEmail(null, true)).toBe(false)
    expect(isAllowedHostEmail("jo@gmail.com", true)).toBe(false)
  })

  it("rejects lookalike domains", () => {
    expect(isAllowedHostEmail("jo@notimproving.com", true)).toBe(false)
    expect(isAllowedHostEmail("jo@improving.com.evil.io", true)).toBe(false)
    expect(isAllowedHostEmail("jo@evil.io@improving.com", true)).toBe(false)
  })

  it("matches the domain written in the security rules", () => {
    const rules = readFileSync(
      new URL("../../../firebase/database.rules.json", import.meta.url),
      "utf8",
    )
    const escaped = HOST_EMAIL_DOMAIN.replaceAll(".", "\\\\.")
    expect(rules).toContain(`@${escaped}$/`)
  })
})
