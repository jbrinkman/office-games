/**
 * Pull a game code out of whatever a person pastes: a bare code ("k7m2-qx"), or a full link
 * such as "https://example.web.app/g/K7M2QX?x=1". The result is uppercase letters and digits only.
 */
export function extractGameCode(raw: string): string {
  const trimmed = raw.trim()
  const fromLink = /\/g\/([^/?#\s]+)/i.exec(trimmed)?.[1]
  return (fromLink ?? trimmed).toUpperCase().replace(/[^A-Z0-9]/g, "")
}
