/**
 * Only accounts with a verified email in this domain can host games.
 * The same rule is enforced in firebase/database.rules.json, which is the real security boundary.
 * A test keeps the two in sync.
 */
export const HOST_EMAIL_DOMAIN = "improving.com"

export function isAllowedHostEmail(email: string | null | undefined, verified: boolean): boolean {
  if (!verified || !email) return false
  return /^[^@]+@[^@]+$/.test(email) && email.toLowerCase().endsWith(`@${HOST_EMAIL_DOMAIN}`)
}
