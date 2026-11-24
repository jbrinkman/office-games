/**
 * Realtime Database keys cannot contain ".", so the Host allowlist at /allowedHosts is keyed by
 * the lowercased email with dots replaced by commas: jane.smith@gmail.com -> jane,smith@gmail,com
 * The security rules compute the same key from the signed-in user's email.
 */
export function emailToAllowlistKey(email: string): string {
  return email.trim().toLowerCase().replaceAll(".", ",")
}
